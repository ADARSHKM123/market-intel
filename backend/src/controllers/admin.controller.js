import { success } from '../utils/apiResponse.js';
import prisma from '../config/prisma.js';
import { isRedisAvailable } from '../config/redis.js';
import { getScraper } from '../scrapers/index.js';
import { processTexts, clusterSignals } from '../services/nlp.service.js';
import logger from '../utils/logger.js';

export async function triggerScrape(req, res, next) {
  try {
    if (!isRedisAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Redis not available. Use /api/admin/scrape-direct/:source instead.',
      });
    }
    const { scrapeQueue } = await import('../queues/scrape.queue.js');
    const { source } = req.params;
    await scrapeQueue.add(`manual-scrape-${source}`, { source, manual: true });
    return success(res, { message: `Scrape job queued for ${source}` });
  } catch (err) {
    next(err);
  }
}

/**
 * Direct scrape — runs synchronously without Redis/BullMQ.
 * POST /api/admin/scrape-direct/:source
 */
export async function triggerDirectScrape(req, res, next) {
  try {
    const { source: sourceType } = req.params;
    logger.info({ sourceType }, '[DirectScrape] Starting');

    const scraper = getScraper(sourceType);
    if (!scraper) {
      return res.status(400).json({ success: false, message: `No scraper for: ${sourceType}` });
    }

    const sources = await prisma.source.findMany({
      where: { type: sourceType, enabled: true },
    });

    if (sources.length === 0) {
      return success(res, { source: sourceType, status: 'no_sources', newPosts: 0 });
    }

    let totalNew = 0;
    let totalErrors = 0;

    for (const source of sources) {
      try {
        const { posts, metadata } = await scraper(source);

        let newCount = 0;
        for (const post of posts) {
          try {
            const existing = await prisma.rawPost.findUnique({
              where: {
                sourceId_externalId: {
                  sourceId: source.id,
                  externalId: post.externalId,
                },
              },
            });

            if (!existing) {
              await prisma.rawPost.create({
                data: {
                  sourceId: source.id,
                  externalId: post.externalId,
                  title: post.title,
                  body: post.body || null,
                  author: post.author || null,
                  url: post.url || null,
                  metadata: post.metadata || {},
                  publishedAt: post.publishedAt || new Date(),
                  processed: false,
                },
              });
              newCount++;
            }
          } catch (err) {
            logger.warn({ externalId: post.externalId, err: err.message }, '[DirectScrape] Failed to upsert post');
            totalErrors++;
          }
        }

        totalNew += newCount;
        logger.info({ sourceName: source.name, fetched: posts.length, new: newCount, quotaUsed: metadata?.quotaUsed }, '[DirectScrape] Source done');

        await prisma.source.update({
          where: { id: source.id },
          data: { lastScrapedAt: new Date() },
        });

      } catch (err) {
        logger.error({ sourceId: source.id, err: err.message }, '[DirectScrape] Source scrape failed');
        totalErrors++;
      }
    }

    // Process unprocessed posts through NLP (if NLP service is available)
    let nlpProcessed = 0;
    const unprocessed = await prisma.rawPost.findMany({
      where: { processed: false, source: { type: sourceType } },
      include: { source: true },
      take: 100,
    });

    if (unprocessed.length > 0) {
      const texts = unprocessed.map((p) => [p.title, p.body].filter(Boolean).join('. '));
      const nlpResult = await processTexts({ source: sourceType, texts });

      if (nlpResult && nlpResult.signals) {
        for (let i = 0; i < nlpResult.signals.length; i++) {
          const signal = nlpResult.signals[i];
          const rawPostId = i < unprocessed.length ? unprocessed[i].id : null;
          try {
            await prisma.signal.create({
              data: {
                rawPostId,
                type: signal.type,
                title: signal.title,
                content: signal.content,
                confidence: signal.confidence || 0,
                momentum: signal.momentum || 0,
                mentionCount: signal.mention_count || 1,
                metadata: signal.metadata || {},
              },
            });
          } catch (err) {
            logger.warn({ err: err.message }, '[DirectScrape] Failed to save signal');
          }
        }
        nlpProcessed = unprocessed.length;
      }

      await prisma.rawPost.updateMany({
        where: { id: { in: unprocessed.map((p) => p.id) } },
        data: { processed: true },
      });
    }

    return success(res, {
      source: sourceType,
      status: 'completed',
      newPosts: totalNew,
      nlpProcessed,
      errors: totalErrors,
      processedAt: new Date().toISOString(),
    });

  } catch (err) {
    next(err);
  }
}

export async function getJobStatus(req, res, next) {
  try {
    if (!isRedisAvailable()) {
      return success(res, {
        message: 'Redis not available — queue status unavailable',
        scrape: {}, process: {}, cluster: {}, alert: {},
      });
    }

    const { scrapeQueue } = await import('../queues/scrape.queue.js');
    const { processQueue } = await import('../queues/process.queue.js');
    const { clusterQueue } = await import('../queues/cluster.queue.js');
    const { alertQueue } = await import('../queues/alert.queue.js');

    const [scrape, process, cluster, alert] = await Promise.all([
      scrapeQueue.getJobCounts(),
      processQueue.getJobCounts(),
      clusterQueue.getJobCounts(),
      alertQueue.getJobCounts(),
    ]);

    return success(res, { scrape, process, cluster, alert });
  } catch (err) {
    next(err);
  }
}

/**
 * Direct cluster — runs synchronously without Redis.
 * POST /api/admin/cluster-direct
 */
export async function triggerDirectCluster(req, res, next) {
  try {
    logger.info('[DirectCluster] Starting');

    // Fetch recent unlinked signals
    const signals = await prisma.signal.findMany({
      where: { opportunities: { none: {} } },
      include: { rawPost: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    if (signals.length < 3) {
      return success(res, { status: 'skipped', reason: 'not_enough_signals', signalCount: signals.length });
    }

    const signalIds = signals.map((s) => s.id);
    const texts = signals.map((s) => [s.title, s.content].filter(Boolean).join('. '));
    const numClusters = Math.min(Math.max(3, Math.floor(signals.length / 5)), 10);

    const result = await clusterSignals({ signal_ids: signalIds, texts, num_clusters: numClusters });

    if (!result || !result.clusters || result.clusters.length === 0) {
      return success(res, { status: 'no_clusters', signalCount: signals.length });
    }

    let created = 0;
    for (const cluster of result.clusters) {
      if (!cluster.signal_ids || cluster.signal_ids.length === 0) continue;

      const clusterSigs = signals.filter((s) => cluster.signal_ids.includes(s.id));
      const avgConfidence = clusterSigs.reduce((sum, s) => sum + s.confidence, 0) / clusterSigs.length;
      const avgMomentum = clusterSigs.reduce((sum, s) => sum + s.momentum, 0) / clusterSigs.length;
      const totalMentions = clusterSigs.reduce((sum, s) => sum + s.mentionCount, 0);

      const score = Math.round(Math.min(100, avgConfidence * 60 + (totalMentions / clusterSigs.length) * 5));
      const momentum = Math.round(avgMomentum);

      try {
        const opportunity = await prisma.opportunity.create({
          data: {
            title: cluster.title || `Opportunity Cluster ${cluster.cluster_id}`,
            description: cluster.description || `Cluster of ${cluster.signal_ids.length} related signals`,
            category: cluster.category || 'tool',
            status: 'identified',
            score, momentum,
            metadata: { source_signals: cluster.signal_ids.length, coherence: cluster.coherence_score, auto_generated: true },
          },
        });

        for (const sigId of cluster.signal_ids) {
          try {
            await prisma.signalOpportunity.create({
              data: { signalId: sigId, opportunityId: opportunity.id, weight: cluster.coherence_score || 0.8 },
            });
          } catch (err) {
            // skip duplicates
          }
        }

        await prisma.trendSnapshot.create({
          data: { opportunityId: opportunity.id, momentum, score, mentionCount: totalMentions, snapshotDate: new Date() },
        });

        created++;
      } catch (err) {
        logger.error({ err: err.message }, '[DirectCluster] Failed to create opportunity');
      }
    }

    logger.info({ created, clusters: result.clusters.length }, '[DirectCluster] Done');
    return success(res, {
      status: 'completed',
      signalsProcessed: signals.length,
      clustersFound: result.clusters.length,
      opportunitiesCreated: created,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDbStats(req, res, next) {
  try {
    const [users, sources, rawPosts, signals, opportunities, watches] = await Promise.all([
      prisma.user.count(),
      prisma.source.count(),
      prisma.rawPost.count(),
      prisma.signal.count(),
      prisma.opportunity.count(),
      prisma.watch.count(),
    ]);
    return success(res, { users, sources, rawPosts, signals, opportunities, watches });
  } catch (err) {
    next(err);
  }
}

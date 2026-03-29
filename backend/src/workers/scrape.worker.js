import { Worker } from 'bullmq';
import { getConnection } from '../queues/connection.js';
import { processTexts } from '../services/nlp.service.js';
import { getScraper } from '../scrapers/index.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

const scrapeWorker = new Worker('SCRAPE', async (job) => {
  const { source: sourceType, manual } = job.data;
  logger.info({ sourceType, manual }, `[ScrapeWorker] Processing scrape job for: ${sourceType}`);

  await job.updateProgress(5);

  // 1. Get the scraper function for this source type
  const scraper = getScraper(sourceType);
  if (!scraper) {
    throw new Error(`No scraper registered for source type: ${sourceType}`);
  }

  // 2. Find all enabled sources of this type
  const sources = await prisma.source.findMany({
    where: { type: sourceType, enabled: true },
  });

  if (sources.length === 0) {
    logger.warn({ sourceType }, '[ScrapeWorker] No enabled sources found');
    return { source: sourceType, status: 'no_sources', processedAt: new Date().toISOString() };
  }

  await job.updateProgress(10);

  let totalNew = 0;
  let totalErrors = 0;

  // 3. Scrape each source
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    logger.info({ sourceId: source.id, sourceName: source.name }, '[ScrapeWorker] Scraping source');

    try {
      const { posts, metadata } = await scraper(source);

      await job.updateProgress(10 + Math.floor(((i + 0.5) / sources.length) * 60));

      // 4. Upsert raw posts into DB (dedup by sourceId + externalId)
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
          logger.warn({ externalId: post.externalId, err: err.message }, '[ScrapeWorker] Failed to upsert post');
          totalErrors++;
        }
      }

      totalNew += newCount;
      logger.info({ sourceName: source.name, fetched: posts.length, new: newCount, quotaUsed: metadata.quotaUsed }, '[ScrapeWorker] Source scrape done');

      // 5. Update lastScrapedAt
      await prisma.source.update({
        where: { id: source.id },
        data: { lastScrapedAt: new Date() },
      });

      await job.updateProgress(10 + Math.floor(((i + 1) / sources.length) * 60));

    } catch (err) {
      logger.error({ sourceId: source.id, err: err.message }, '[ScrapeWorker] Source scrape failed');
      totalErrors++;
    }
  }

  await job.updateProgress(75);

  // 6. Process unprocessed posts through NLP
  const unprocessed = await prisma.rawPost.findMany({
    where: {
      processed: false,
      source: { type: sourceType },
    },
    include: { source: true },
    take: 100,
  });

  if (unprocessed.length > 0) {
    const texts = unprocessed.map((p) => [p.title, p.body].filter(Boolean).join('. '));

    const nlpResult = await processTexts({ source: sourceType, texts });

    if (nlpResult && nlpResult.signals) {
      logger.info({ signalCount: nlpResult.signals.length }, '[ScrapeWorker] NLP processing complete');

      // Save signals linked to their raw posts
      for (let i = 0; i < nlpResult.signals.length; i++) {
        const signal = nlpResult.signals[i];
        // Link signal to the corresponding raw post if indices match
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
          logger.warn({ err: err.message }, '[ScrapeWorker] Failed to save signal');
        }
      }
    }

    // Mark posts as processed
    await prisma.rawPost.updateMany({
      where: { id: { in: unprocessed.map((p) => p.id) } },
      data: { processed: true },
    });
  }

  await job.updateProgress(100);
  return {
    source: sourceType,
    status: 'completed',
    newPosts: totalNew,
    nlpProcessed: unprocessed.length,
    errors: totalErrors,
    processedAt: new Date().toISOString(),
  };
}, {
  connection: getConnection(),
  concurrency: 2,
});

scrapeWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, '[ScrapeWorker] Job failed');
});

export default scrapeWorker;

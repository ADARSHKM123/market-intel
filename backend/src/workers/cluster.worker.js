import { Worker } from 'bullmq';
import { getConnection } from '../queues/connection.js';
import { clusterSignals } from '../services/nlp.service.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

const clusterWorker = new Worker('CLUSTER', async (job) => {
  logger.info('[ClusterWorker] Running opportunity clustering');

  // Fetch recent unlinked signals (not yet assigned to any opportunity)
  const signals = await prisma.signal.findMany({
    where: {
      opportunities: { none: {} },
    },
    include: { rawPost: true },
    take: 200,
    orderBy: { createdAt: 'desc' },
  });

  if (signals.length < 3) {
    logger.info({ signalCount: signals.length }, '[ClusterWorker] Not enough unlinked signals to cluster');
    await job.updateProgress(100);
    return { status: 'skipped', reason: 'not_enough_signals' };
  }

  const signalIds = signals.map((s) => s.id);
  const texts = signals.map((s) => [s.title, s.content].filter(Boolean).join('. '));
  const numClusters = Math.min(Math.max(3, Math.floor(signals.length / 5)), 10);

  const result = await clusterSignals({
    signal_ids: signalIds,
    texts,
    num_clusters: numClusters,
  });

  if (!result || !result.clusters || result.clusters.length === 0) {
    logger.warn('[ClusterWorker] Clustering returned no results');
    await job.updateProgress(100);
    return { status: 'no_clusters' };
  }

  logger.info({ clusterCount: result.clusters.length }, '[ClusterWorker] Clustering complete, creating opportunities');

  let created = 0;
  for (const cluster of result.clusters) {
    if (!cluster.signal_ids || cluster.signal_ids.length === 0) continue;

    // Compute aggregate score and momentum from signals in this cluster
    const clusterSignals = signals.filter((s) => cluster.signal_ids.includes(s.id));
    const avgConfidence = clusterSignals.reduce((sum, s) => sum + s.confidence, 0) / clusterSignals.length;
    const avgMomentum = clusterSignals.reduce((sum, s) => sum + s.momentum, 0) / clusterSignals.length;
    const totalMentions = clusterSignals.reduce((sum, s) => sum + s.mentionCount, 0);

    const score = Math.round(Math.min(100, avgConfidence * 60 + (totalMentions / clusterSignals.length) * 5));
    const momentum = Math.round(avgMomentum);

    try {
      const opportunity = await prisma.opportunity.create({
        data: {
          title: cluster.title || `Opportunity Cluster ${cluster.cluster_id}`,
          description: cluster.description || `Cluster of ${cluster.signal_ids.length} related signals`,
          category: cluster.category || 'tool',
          status: 'identified',
          score,
          momentum,
          metadata: {
            source_signals: cluster.signal_ids.length,
            coherence: cluster.coherence_score,
            auto_generated: true,
          },
        },
      });

      // Link signals to the opportunity
      for (const sigId of cluster.signal_ids) {
        try {
          await prisma.signalOpportunity.create({
            data: {
              signalId: sigId,
              opportunityId: opportunity.id,
              weight: cluster.coherence_score || 0.8,
            },
          });
        } catch (err) {
          // Signal might not exist or already linked
          logger.warn({ sigId, err: err.message }, '[ClusterWorker] Failed to link signal');
        }
      }

      // Create initial trend snapshot
      await prisma.trendSnapshot.create({
        data: {
          opportunityId: opportunity.id,
          momentum,
          score,
          mentionCount: totalMentions,
          snapshotDate: new Date(),
        },
      });

      created++;
      logger.info({ oppTitle: opportunity.title, signals: cluster.signal_ids.length }, '[ClusterWorker] Created opportunity');
    } catch (err) {
      logger.error({ err: err.message }, '[ClusterWorker] Failed to create opportunity');
    }
  }

  await job.updateProgress(100);
  return {
    status: 'completed',
    clustersFound: result.clusters.length,
    opportunitiesCreated: created,
    processedAt: new Date().toISOString(),
  };
}, {
  connection: getConnection(),
  concurrency: 1,
});

clusterWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, '[ClusterWorker] Job failed');
});

export default clusterWorker;

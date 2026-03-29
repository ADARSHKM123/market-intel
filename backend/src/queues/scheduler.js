import { scrapeQueue } from './scrape.queue.js';
import { processQueue } from './process.queue.js';
import { clusterQueue } from './cluster.queue.js';
import logger from '../utils/logger.js';

export async function initScheduler() {
  try {
    // Scrape Hacker News every 3 hours
    await scrapeQueue.upsertJobScheduler('scrape-hackernews', {
      pattern: '0 */3 * * *',
    }, {
      name: 'scrape-hackernews',
      data: { source: 'hackernews' },
    });

    // Scrape YouTube every 6 hours
    await scrapeQueue.upsertJobScheduler('scrape-youtube', {
      pattern: '0 */6 * * *',
    }, {
      name: 'scrape-youtube',
      data: { source: 'youtube' },
    });

    // Scrape Dev.to every 4 hours
    await scrapeQueue.upsertJobScheduler('scrape-devto', {
      pattern: '0 */4 * * *',
    }, {
      name: 'scrape-devto',
      data: { source: 'devto' },
    });

    // Scrape GitHub Trending every 6 hours
    await scrapeQueue.upsertJobScheduler('scrape-github', {
      pattern: '0 */6 * * *',
    }, {
      name: 'scrape-github',
      data: { source: 'github_trending' },
    });

    // Scrape Product Hunt every 12 hours
    await scrapeQueue.upsertJobScheduler('scrape-producthunt', {
      pattern: '0 */12 * * *',
    }, {
      name: 'scrape-producthunt',
      data: { source: 'producthunt' },
    });

    // Compute momentum daily at 6 AM
    await processQueue.upsertJobScheduler('compute-momentum', {
      pattern: '0 6 * * *',
    }, {
      name: 'compute-momentum',
      data: { task: 'momentum' },
    });

    // Cluster opportunities daily at 2 AM
    await clusterQueue.upsertJobScheduler('cluster-opportunities', {
      pattern: '0 2 * * *',
    }, {
      name: 'cluster-opportunities',
      data: {},
    });

    logger.info('All scheduled jobs registered');
  } catch (err) {
    logger.error({ err }, 'Failed to initialize scheduler');
  }
}

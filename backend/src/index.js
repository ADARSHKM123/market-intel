import 'dotenv/config';
import { createApp } from './app.js';
import config from './config/index.js';
import { isRedisAvailable } from './config/redis.js';
import logger from './utils/logger.js';

const app = createApp();

app.listen(config.port, async () => {
  logger.info(`Backend server running on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);

  // Wait a moment for Redis connection attempt to resolve
  await new Promise((r) => setTimeout(r, 2000));

  if (isRedisAvailable()) {
    try {
      // Dynamically import workers so they only start if Redis is up
      await import('./workers/scrape.worker.js');
      await import('./workers/process.worker.js');
      await import('./workers/cluster.worker.js');
      await import('./workers/alert.worker.js');
      logger.info('BullMQ workers started');

      const { initScheduler } = await import('./queues/scheduler.js');
      await initScheduler();
      logger.info('Job scheduler initialized');
    } catch (err) {
      logger.error({ err }, 'Failed to initialize workers/scheduler');
    }
  } else {
    logger.warn('Redis not available — running without background job queues');
    logger.info('Use POST /api/admin/scrape-direct/:source to scrape without Redis');
  }
});

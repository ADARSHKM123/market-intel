import IORedis from 'ioredis';
import config from './index.js';
import logger from '../utils/logger.js';

let redis = null;
let redisAvailable = false;

try {
  redis = new IORedis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null, // Required by BullMQ
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('Redis connection failed after 3 retries — running without Redis');
        return null; // Stop retrying
      }
      return Math.min(times * 500, 2000);
    },
    lazyConnect: true,
  });

  redis.on('connect', () => {
    redisAvailable = true;
    logger.info('Redis connected');
  });

  redis.on('error', (err) => {
    redisAvailable = false;
    // Only log once, not on every retry
  });

  redis.on('close', () => {
    redisAvailable = false;
  });

  // Try to connect but don't block startup
  redis.connect().catch(() => {
    logger.warn('Redis not available — queue features disabled');
  });
} catch (err) {
  logger.warn('Redis not available — queue features disabled');
}

export function isRedisAvailable() {
  return redisAvailable;
}

export default redis;

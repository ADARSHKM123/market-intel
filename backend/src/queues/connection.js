import IORedis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let connection = null;

export function getConnection() {
  if (!connection) {
    try {
      connection = new IORedis({
        host: config.redis.host,
        port: config.redis.port,
        maxRetriesPerRequest: null, // Required by BullMQ
      });
    } catch (err) {
      logger.warn('Could not create Redis connection for BullMQ');
    }
  }
  return connection;
}

export default connection;

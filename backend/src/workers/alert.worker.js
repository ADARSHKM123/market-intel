import { Worker } from 'bullmq';
import { getConnection } from '../queues/connection.js';
import logger from '../utils/logger.js';

const alertWorker = new Worker('ALERT', async (job) => {
  const { userId, watchId, message } = job.data;
  logger.info({ userId, watchId }, '[AlertWorker] Sending alert (mock)');

  await job.updateProgress(100);
  return { status: 'sent', userId, watchId };
}, {
  connection: getConnection(),
  concurrency: 2,
});

alertWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, '[AlertWorker] Job failed');
});

export default alertWorker;

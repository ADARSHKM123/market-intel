import { Worker } from 'bullmq';
import { getConnection } from '../queues/connection.js';
import logger from '../utils/logger.js';

const processWorker = new Worker('PROCESS', async (job) => {
  const { task } = job.data;
  logger.info({ task }, '[ProcessWorker] Processing job');

  if (task === 'momentum') {
    logger.info('[ProcessWorker] Computing momentum scores (mock)');
    await job.updateProgress(100);
    return { task: 'momentum', status: 'completed' };
  }

  return { status: 'unknown_task' };
}, {
  connection: getConnection(),
  concurrency: 1,
});

processWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, '[ProcessWorker] Job failed');
});

export default processWorker;

import { Queue } from 'bullmq';
import { getConnection } from './connection.js';

export const processQueue = new Queue('PROCESS', { connection: getConnection() });

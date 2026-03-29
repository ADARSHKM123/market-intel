import { Queue } from 'bullmq';
import { getConnection } from './connection.js';

export const clusterQueue = new Queue('CLUSTER', { connection: getConnection() });

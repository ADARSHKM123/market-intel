import { Queue } from 'bullmq';
import { getConnection } from './connection.js';

export const alertQueue = new Queue('ALERT', { connection: getConnection() });

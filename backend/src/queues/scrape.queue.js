import { Queue } from 'bullmq';
import { getConnection } from './connection.js';

export const scrapeQueue = new Queue('SCRAPE', { connection: getConnection() });

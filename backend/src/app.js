import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mountRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('dev'));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  mountRoutes(app);

  app.use(errorHandler);

  return app;
}

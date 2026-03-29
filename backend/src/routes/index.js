import authRoutes from './auth.routes.js';
import sourcesRoutes from './sources.routes.js';
import opportunitiesRoutes from './opportunities.routes.js';
import signalsRoutes from './signals.routes.js';
import analyticsRoutes from './analytics.routes.js';
import watchesRoutes from './watches.routes.js';
import adminRoutes from './admin.routes.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

export default function mountRoutes(app) {
  app.use('/api/auth', authRoutes);
  app.use('/api/sources', authenticate, sourcesRoutes);
  app.use('/api/opportunities', authenticate, opportunitiesRoutes);
  app.use('/api/signals', authenticate, signalsRoutes);
  app.use('/api/analytics', authenticate, analyticsRoutes);
  app.use('/api/watches', authenticate, watchesRoutes);
  app.use('/api/admin', authenticate, requireAdmin, adminRoutes);
}

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import houseRoutes from './routes/houseRoutes.js';
import spinRoutes from './routes/spinRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

export function createApp() {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/houses', houseRoutes);
  app.use('/api/spins', spinRoutes);
  app.use('/api/admin', adminRoutes);

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

  return app;
}

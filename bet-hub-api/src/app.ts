import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import houseRoutes from './routes/houseRoutes.js';
import spinRoutes from './routes/spinRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import scoreRoutes from './routes/scoreRoutes.js';
import balanceRoutes from './routes/balanceRoutes.js';

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
  app.use('/api/score', scoreRoutes);
  app.use('/api/balance', balanceRoutes);

  // 404
  app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));


  return app;
}

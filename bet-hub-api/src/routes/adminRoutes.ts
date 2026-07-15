import { Router } from 'express';
import {
  listUsers,
  getEarningsOverview,
  setUserRole,
  getUserSpins,
} from '../controllers/adminController.js';
import { upsertBonuses } from '../controllers/bonusController.js';
import {
  adminGetStreamers,
  adminCreateStreamer,
  adminUpdateStreamer,
  adminDeleteStreamer,
  adminForceCheckStreamers,
} from '../controllers/streamerController.js';

import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', listUsers);
router.get('/earnings', getEarningsOverview);
router.get('/users/:userId/spins', getUserSpins);
router.patch('/users/:userId/role', setUserRole);

// [ADMIN] Configurar urls manuais de gorjeta/deposito por casa
router.patch('/bonuses', upsertBonuses);

// [ADMIN] Streamers
router.post('/streamers/check', adminForceCheckStreamers);
router.get('/streamers', adminGetStreamers);
router.post('/streamers', adminCreateStreamer);
router.patch('/streamers/:id', adminUpdateStreamer);
router.delete('/streamers/:id', adminDeleteStreamer);

export default router;

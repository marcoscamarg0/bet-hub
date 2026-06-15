import { Router } from 'express';
import {
  listUsers,
  getEarningsOverview,
  getUserSpins,
  setUserRole,
} from '../controllers/adminController.js';
import { upsertBonuses } from '../controllers/bonusController.js';

import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/users', listUsers);
router.get('/earnings', getEarningsOverview);
router.get('/users/:userId/spins', getUserSpins);
router.patch('/users/:userId/role', setUserRole);

// [ADMIN] Configurar urls manuais de gorjeta/deposito por casa
router.post('/bonuses', upsertBonuses);

export default router;


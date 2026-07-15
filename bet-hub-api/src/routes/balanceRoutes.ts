import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getBalance, claimDaily, spendBalance, addBalance } from '../controllers/balanceController.js';

const router = Router();

router.get('/', requireAuth, getBalance);
router.post('/claim', requireAuth, claimDaily);
router.post('/spend', requireAuth, spendBalance);
router.post('/add', requireAuth, addBalance);

export default router;

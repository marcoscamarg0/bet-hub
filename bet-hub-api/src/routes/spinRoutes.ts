import { Router } from 'express';
import { createSpin, getMySpins, getMyToday } from '../controllers/spinController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', createSpin);          // registrar um spin (roleta feita)
router.get('/me', getMySpins);          // histórico próprio (com filtros from/to/houseId)
router.get('/me/today', getMyToday);    // resumo do dia

export default router;

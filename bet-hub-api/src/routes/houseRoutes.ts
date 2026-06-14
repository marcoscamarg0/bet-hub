import { Router } from 'express';
import { listHouses, createHouse, updateHouse, deleteHouse } from '../controllers/houseController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Público: qualquer pessoa pode listar as casas (para montar a UI)
router.get('/', listHouses);

// Admin: criar, editar, remover casas
router.post('/', requireAuth, requireAdmin, createHouse);
router.patch('/:id', requireAuth, requireAdmin, updateHouse);
router.delete('/:id', requireAuth, requireAdmin, deleteHouse);

export default router;

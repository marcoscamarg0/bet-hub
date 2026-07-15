import { Router } from 'express';
import { getLiveStreamers } from '../controllers/streamerController.js';

const router = Router();

router.get('/live', getLiveStreamers);

export default router;

import { Router } from 'express';
import { Score } from '../models/Score.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/score?game=forest&limit=50&period=today|week|all
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const game = req.query.game as string | undefined;
    const period = req.query.period as string | undefined;

    const filter: Record<string, unknown> = {};
    if (game && ['mines', 'forest', 'dragon'].includes(game)) {
      filter.game = game;
    }
    if (period === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: start };
    } else if (period === 'week') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      filter.createdAt = { $gte: start };
    }

    const scores = await Score.find(filter)
      .sort({ amount: -1 })
      .limit(limit)
      .lean();
    res.json(scores);
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// POST /api/score  (authenticated)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, amount, mines, cells, game, metadata } = req.body;
    if (!name || amount == null) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const validGame = ['mines', 'forest', 'dragon'].includes(game) ? game : 'mines';
    const score = new Score({
      name,
      amount,
      mines,
      cells,
      game: validGame,
      userId: req.auth?.id,
      username: req.auth?.username || req.auth?.name,
      metadata,
    });
    await score.save();
    res.status(201).json(score);
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

export default router;

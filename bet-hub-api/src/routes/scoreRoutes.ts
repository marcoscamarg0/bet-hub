import { Router } from 'express';
import { Score } from '../models/Score.js';

const router = Router();

// Get top scores
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const scores = await Score.find()
      .sort({ amount: -1 })
      .limit(limit)
      .lean();
    res.json(scores);
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// Add new score
router.post('/', async (req, res) => {
  try {
    const { name, amount, mines, cells } = req.body;
    if (!name || !amount || !mines || !cells) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    const score = new Score({ name, amount, mines, cells });
    await score.save();
    res.status(201).json(score);
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

export default router;

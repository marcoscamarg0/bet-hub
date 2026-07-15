import { Request, Response } from 'express';
import { User } from '../models/User.js';

const DAILY_AMOUNT = 100;

/** Checks if the user should receive their daily balance */
function shouldResetDaily(lastReset: Date | null): boolean {
  if (!lastReset) return true;
  const now = new Date();
  const last = new Date(lastReset);
  // Compare calendar dates (not 24h gaps) in PT-BR timezone
  return (
    now.getFullYear() !== last.getFullYear() ||
    now.getMonth() !== last.getMonth() ||
    now.getDate() !== last.getDate()
  );
}

/** GET /api/balance — returns current balance and whether daily is claimable */
export async function getBalance(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

  const user = await User.findById(req.auth.id).select('balance lastDailyReset');
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const canClaimDaily = shouldResetDaily(user.lastDailyReset);

  return res.json({
    balance: user.balance ?? 0,
    canClaimDaily,
    lastDailyReset: user.lastDailyReset,
  });
}

/** POST /api/balance/claim — credits R$100 daily bonus (once per day) */
export async function claimDaily(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

  const user = await User.findById(req.auth.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if (!shouldResetDaily(user.lastDailyReset)) {
    return res.status(409).json({
      error: 'Bônus diário já coletado. Volte amanhã!',
      balance: user.balance,
    });
  }

  user.balance = (user.balance ?? 0) + DAILY_AMOUNT;
  user.lastDailyReset = new Date();
  await user.save();

  return res.json({ balance: user.balance, claimed: DAILY_AMOUNT });
}

/** POST /api/balance/spend — deducts an amount from balance */
export async function spendBalance(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

  const { amount } = req.body as { amount?: number };
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valor inválido' });
  }

  const user = await User.findById(req.auth.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  if ((user.balance ?? 0) < amount) {
    return res.status(400).json({ error: 'Saldo insuficiente', balance: user.balance });
  }

  user.balance = (user.balance ?? 0) - amount;
  await user.save();

  return res.json({ balance: user.balance, spent: amount });
}

/** POST /api/balance/add — adds winnings to balance */
export async function addBalance(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

  const { amount } = req.body as { amount?: number };
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valor inválido' });
  }

  const user = await User.findById(req.auth.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  user.balance = (user.balance ?? 0) + amount;
  await user.save();

  return res.json({ balance: user.balance, added: amount });
}

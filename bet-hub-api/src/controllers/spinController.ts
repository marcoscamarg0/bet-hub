import { Request, Response } from 'express';
import { Spin } from '../models/Spin.js';
import { House } from '../models/House.js';

/** Usuário registra um spin (roleta feita) com horário e valor ganho */
export async function createSpin(req: Request, res: Response) {
  try {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

    const { houseId, roletaLabel, amount, playedAt } = req.body as {
      houseId?: string;
      roletaLabel?: string;
      amount?: number;
      playedAt?: string;
    };

    if (!houseId || !roletaLabel) {
      return res.status(400).json({ error: 'houseId e roletaLabel são obrigatórios' });
    }

    const house = await House.findOne({ id: houseId });
    if (!house) {
      return res.status(404).json({ error: 'Casa de apostas não encontrada' });
    }

    const spin = await Spin.create({
      user: req.auth.id,
      houseId: house.id,
      houseName: house.name,
      roletaLabel,
      amount: typeof amount === 'number' && amount >= 0 ? amount : 0,
      playedAt: playedAt ? new Date(playedAt) : new Date(),
    });

    return res.status(201).json({ spin });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao registrar spin' });
  }
}

/** Lista os spins do próprio usuário (histórico pessoal) */
export async function getMySpins(req: Request, res: Response) {
  try {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

    const { from, to, houseId, limit = '100' } = req.query as Record<string, string>;

    const query: Record<string, unknown> = { user: req.auth.id };
    if (houseId) query.houseId = houseId;
    if (from || to) {
      query.playedAt = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }

    const spins = await Spin.find(query)
      .sort({ playedAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 500));

    const totalGanho = spins.reduce((sum, s) => sum + s.amount, 0);

    return res.json({ spins, totalGanho, count: spins.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar spins' });
  }
}

/** Resumo diário do próprio usuário (quais roletas já fez hoje) */
export async function getMyToday(req: Request, res: Response) {
  try {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const spins = await Spin.find({
      user: req.auth.id,
      playedAt: { $gte: start, $lte: end },
    }).sort({ playedAt: -1 });

    const totalGanhoHoje = spins.reduce((sum, s) => sum + s.amount, 0);

    return res.json({ spins, totalGanhoHoje, date: start.toISOString().slice(0, 10) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar resumo do dia' });
  }
}

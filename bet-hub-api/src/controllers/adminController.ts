import { Request, Response } from 'express';
import { User } from '../models/User.js';
import { Spin } from '../models/Spin.js';
import mongoose from 'mongoose';

/** [ADMIN] Lista todos os usuários (sem senha) */
export async function listUsers(_req: Request, res: Response) {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    return res.json({ users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
}

/**
 * [ADMIN] Visão geral de ganhos por usuário.
 * Retorna, para cada usuário: total ganho, total de spins, e ganho de hoje.
 */
export async function getEarningsOverview(_req: Request, res: Response) {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const totals = await Spin.aggregate([
      {
        $group: {
          _id: '$user',
          totalGanho: { $sum: '$amount' },
          totalSpins: { $sum: 1 },
          lastPlayedAt: { $max: '$playedAt' },
        },
      },
    ]);

    const todayTotals = await Spin.aggregate([
      { $match: { playedAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: '$user',
          ganhoHoje: { $sum: '$amount' },
          spinsHoje: { $sum: 1 },
        },
      },
    ]);

    const todayMap = new Map(todayTotals.map((t) => [t._id.toString(), t]));

    const users = await User.find().select('-passwordHash');

    const overview = users.map((u) => {
      const t = totals.find((x) => x._id.toString() === u._id.toString());
      const today = todayMap.get(u._id.toString());
      return {
        user: { id: u._id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt },
        totalGanho: t?.totalGanho ?? 0,
        totalSpins: t?.totalSpins ?? 0,
        lastPlayedAt: t?.lastPlayedAt ?? null,
        ganhoHoje: today?.ganhoHoje ?? 0,
        spinsHoje: today?.spinsHoje ?? 0,
      };
    });

    // ordenar por maior ganho total
    overview.sort((a, b) => b.totalGanho - a.totalGanho);

    return res.json({ overview });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar visão geral de ganhos' });
  }
}

/** [ADMIN] Histórico completo de spins de um usuário específico */
export async function getUserSpins(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    const { from, to, houseId, limit = '200' } = req.query as Record<string, string>;

    const query: Record<string, unknown> = { user: userId };
    if (houseId) query.houseId = houseId;
    if (from || to) {
      query.playedAt = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    }

    const spins = await Spin.find(query)
      .sort({ playedAt: -1 })
      .limit(Math.min(parseInt(limit, 10) || 200, 1000));

    const totalGanho = spins.reduce((sum, s) => sum + s.amount, 0);

    return res.json({ spins, totalGanho, count: spins.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar spins do usuário' });
  }
}

/** [ADMIN] Promove ou remove privilégio de admin de um usuário */
export async function setUserRole(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { role } = req.body as { role?: 'user' | 'admin' };

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: "role deve ser 'user' ou 'admin'" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'userId inválido' });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar papel do usuário' });
  }
}

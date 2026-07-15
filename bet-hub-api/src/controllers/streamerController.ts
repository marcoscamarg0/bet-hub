import { Request, Response } from 'express';
import { Streamer } from '../models/Streamer.js';

// ── PUBLIC ────────────────────────────────────────────────────────

/** GET /api/streamers/live — Retorna streamers que estão atualmente ao vivo */
export async function getLiveStreamers(req: Request, res: Response) {
  try {
    const liveStreamers = await Streamer.find({ isLive: true }).sort({ name: 1 });
    return res.json({ streamers: liveStreamers });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar streamers ao vivo' });
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────

/** GET /api/admin/streamers — Lista todos os streamers (ativos e inativos) */
export async function adminGetStreamers(req: Request, res: Response) {
  try {
    const streamers = await Streamer.find().sort({ name: 1 });
    return res.json({ streamers });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar streamers' });
  }
}

/** POST /api/admin/streamers — Adiciona um novo streamer para ser monitorado */
export async function adminCreateStreamer(req: Request, res: Response) {
  try {
    const { name, platform, channelId, tipUrl } = req.body;
    if (!name || !platform || !channelId) {
      return res.status(400).json({ error: 'Nome, plataforma e ID do canal são obrigatórios' });
    }

    const streamer = new Streamer({ name, platform, channelId, tipUrl });
    await streamer.save();

    return res.status(201).json({ streamer });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao criar streamer' });
  }
}

/** PATCH /api/admin/streamers/:id — Atualiza dados do streamer */
export async function adminUpdateStreamer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const update = req.body;
    
    const streamer = await Streamer.findByIdAndUpdate(id, update, { new: true });
    if (!streamer) return res.status(404).json({ error: 'Streamer não encontrado' });

    return res.json({ streamer });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar streamer' });
  }
}

/** DELETE /api/admin/streamers/:id — Remove um streamer */
export async function adminDeleteStreamer(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const streamer = await Streamer.findByIdAndDelete(id);
    if (!streamer) return res.status(404).json({ error: 'Streamer não encontrado' });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar streamer' });
  }
}

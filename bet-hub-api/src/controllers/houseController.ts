import { Request, Response } from 'express';
import { House } from '../models/House.js';

/** Lista todas as casas (uso público, para montar a UI) */
export async function listHouses(_req: Request, res: Response) {
  try {
    const houses = await House.find().sort({ order: 1, createdAt: 1 });
    return res.json({ houses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar casas' });
  }
}

/** [ADMIN] Cria uma nova casa de apostas */
export async function createHouse(req: Request, res: Response) {
  try {
    const { id, name, url, roletas, active, note, order } = req.body as {
      id?: string;
      name?: string;
      url?: string;
      roletas?: { label: string; url: string }[];
      active?: boolean;
      note?: string;
      order?: number;
    };

    if (!id || !name || !url) {
      return res.status(400).json({ error: 'id, name e url são obrigatórios' });
    }

    const exists = await House.findOne({ id: id.toLowerCase() });
    if (exists) {
      return res.status(409).json({ error: 'Já existe uma casa com esse id' });
    }

    const house = await House.create({
      id: id.toLowerCase(),
      name,
      url,
      roletas: roletas ?? [],
      active: active ?? true,
      note,
      order: order ?? (await House.countDocuments()),
    });

    return res.status(201).json({ house });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao criar casa' });
  }
}

/** [ADMIN] Atualiza uma casa existente (por id slug) */
export async function updateHouse(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body as Partial<{
      name: string;
      url: string;
      roletas: { label: string; url: string }[];
      active: boolean;
      note: string;
      order: number;
    }>;

    const house = await House.findOneAndUpdate({ id: id.toLowerCase() }, updates, {
      new: true,
      runValidators: true,
    });

    if (!house) return res.status(404).json({ error: 'Casa não encontrada' });

    return res.json({ house });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar casa' });
  }
}

/** [ADMIN] Remove uma casa */
export async function deleteHouse(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const house = await House.findOneAndDelete({ id: id.toLowerCase() });
    if (!house) return res.status(404).json({ error: 'Casa não encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao remover casa' });
  }
}

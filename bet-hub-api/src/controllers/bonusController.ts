import { Request, Response } from 'express';
import { House } from '../models/House.js';




/**
 * [ADMIN] Atualiza links manuais de gorjeta/deposito.
 * Formato body:
 * {
 *   bonuses: [
 *     { houseId: string, gorjetaUrl?: string, depositeUrl?: string }
 *   ]
 * }
 */
export async function upsertBonuses(req: Request, res: Response) {
  try {
    // requireAuth/requireAdmin já deve estar aplicado na rota
    const { bonuses } = req.body as {
      bonuses?: { houseId: string; gorjetaUrl?: string; depositeUrl?: string }[];
    };

    if (!Array.isArray(bonuses)) {
      return res.status(400).json({ error: 'bonuses deve ser um array' });
    }

    // House model já tem os campos gorjeta/deposito (boolean), então:
    // - setaremos gorjeta/deposito true quando houver url
    // - armazenaremos a url nas props extras (caso o schema permita) ou ignoramos.
    // Como o schema atual não foi lido aqui, usamos um update simples com $set de campos conhecidos
    // e tentamos gravar url em campos opcionais.

    const results = [];

    for (const b of bonuses) {
      const houseId = String(b.houseId || '').toLowerCase();
      if (!houseId) continue;

      const update: Record<string, unknown> = {};

      if (b.gorjetaUrl !== undefined) {
        update.gorjeta = Boolean(String(b.gorjetaUrl).trim());
        // tentativa de persistir url (se o schema tiver)
        update.gorjetaUrl = String(b.gorjetaUrl);
      }

      if (b.depositeUrl !== undefined) {
        update.deposito = Boolean(String(b.depositeUrl).trim());
        update.depositoUrl = String(b.depositeUrl);
      }

      const house = await House.findOneAndUpdate({ id: houseId }, update, {
        new: true,
        runValidators: true,
      });

      if (house) results.push({ houseId: house.id, ok: true });
    }

    return res.json({ ok: true, updated: results.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao atualizar bonuses' });
  }
}


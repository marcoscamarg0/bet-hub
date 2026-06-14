import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Já existe uma conta com esse email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Apenas o primeiro usuário registrado vira admin automaticamente (opcional).
    // Para o fluxo normal, novos cadastros são sempre 'user'.
    const role = 'user' as const;

    const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role });

    const token = signToken({ id: user._id.toString(), role: user.role, name: user.name, email: user.email });

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const token = signToken({ id: user._id.toString(), role: user.role, name: user.name, email: user.email });

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

/** Retorna os dados do usuário autenticado (a partir do token) */
export async function me(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: 'Não autenticado' });

  const user = await User.findById(req.auth.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  return res.json({ user });
}

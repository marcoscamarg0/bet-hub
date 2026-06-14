import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';

const ADMIN_USERNAME = 'mestredosmijos';
const ADMIN_PASSWORD = '123Night!';

function normalizeUsername(value = '') {
  return value.trim().toLowerCase();
}

function internalEmail(username: string) {
  return `${username}@bethub.local`;
}

function publicUser(user: any) {
  return {
    id: user._id,
    name: user.name,
    username: user.username || user.email?.split('@')[0] || user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function ensureAdminUser() {
  const username = ADMIN_USERNAME;
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await User.findOne({
    $or: [
      { username },
      { email: internalEmail(username) },
      { email: 'admin@bethub.com' },
    ],
  });

  if (existing) {
    existing.name = 'Mestre dos Mijos';
    existing.username = username;
    existing.email = existing.email || internalEmail(username);
    existing.passwordHash = passwordHash;
    existing.role = 'admin';
    await existing.save();
    return existing;
  }

  return User.create({
    name: 'Mestre dos Mijos',
    username,
    email: internalEmail(username),
    passwordHash,
    role: 'admin',
  });
}

export async function register(req: Request, res: Response) {
  try {
    const { name, username: rawUsername, email, password } = req.body as {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
    };
    const username = normalizeUsername(rawUsername || email);

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario e senha sao obrigatorios' });
    }
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      return res.status(400).json({ error: 'Use um usuario de 3 a 24 caracteres: letras, numeros, ponto, traco ou underline' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });
    }

    const existing = await User.findOne({
      $or: [{ username }, { email: internalEmail(username) }],
    });
    if (existing) {
      return res.status(409).json({ error: 'Ja existe uma conta com esse usuario' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name?.trim() || username,
      username,
      email: internalEmail(username),
      passwordHash,
      role: 'user',
    });

    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      username: user.username,
      email: user.email,
    });

    return res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao registrar usuario' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { username: rawUsername, email, password } = req.body as {
      username?: string;
      email?: string;
      password?: string;
    };
    const username = normalizeUsername(rawUsername || email);

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario e senha sao obrigatorios' });
    }

    let user = await User.findOne({
      $or: [
        { username },
        { email: username },
        { email: internalEmail(username) },
      ],
    });

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      user = await ensureAdminUser();
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuario ou senha incorretos' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario ou senha incorretos' });
    }

    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      username: user.username,
      email: user.email,
    });

    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
}

/** Retorna os dados do usuario autenticado (a partir do token). */
export async function me(req: Request, res: Response) {
  if (!req.auth) return res.status(401).json({ error: 'Nao autenticado' });

  const user = await User.findById(req.auth.id).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

  return res.json({ user: publicUser(user) });
}

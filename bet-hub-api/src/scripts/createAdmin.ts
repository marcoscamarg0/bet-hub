import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

const ADMIN_USERNAME = 'mestredosmijos';
const ADMIN_PASSWORD = '123Night!';

function internalEmail(username: string) {
  return `${username}@bethub.local`;
}

async function main() {
  await connectDB();

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
    console.log(`Admin pronto: ${username}`);
  } else {
    await User.create({
      name: 'Mestre dos Mijos',
      username,
      email: internalEmail(username),
      passwordHash,
      role: 'admin',
    });
    console.log(`Admin criado: ${username}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Erro ao criar admin:', err);
  process.exit(1);
});

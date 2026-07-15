import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { startLiveCheckService } from './services/liveCheckService.js';

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDB();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`🚀 BetHub API rodando na porta ${PORT}`);
    startLiveCheckService();
  });
}

main().catch((err) => {
  console.error('Erro fatal ao iniciar o servidor:', err);
  process.exit(1);
});

# BetHub — Projeto completo 🎯

Contém dois projetos:

- **`bet-hub/`** — Frontend (Vite + React + TypeScript)
- **`bet-hub-api/`** — Backend (Node + Express + TypeScript + MongoDB Atlas)

## Ordem de setup

### 1. Backend

```bash
cd bet-hub-api
npm install
cp .env.example .env
```

Edite o `.env`:
```
MONGO_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/bethub?retryWrites=true&w=majority
JWT_SECRET=algo-grande-e-aleatorio
PORT=4000
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@bethub.com
ADMIN_PASSWORD=senha-forte
ADMIN_NAME=Admin
```

```bash
npm run seed:admin      # cria seu usuário admin
npm run seed:houses     # popula as casas iniciais
npm run dev             # http://localhost:4000
```

### 2. Frontend

```bash
cd bet-hub
npm install
cp .env.example .env
```

Edite o `.env`:
```
VITE_API_URL=http://localhost:4000
```

```bash
npm run dev             # http://localhost:5173
```

### 3. Login

Acesse http://localhost:5173, faça login com o email/senha do `ADMIN_EMAIL`/`ADMIN_PASSWORD` — o botão **Admin** aparece no topo, dando acesso ao gerenciamento de casas e ao painel de ganhos dos usuários.

Outros usuários podem se cadastrar normalmente pela tela de login ("Criar conta") e usarão a lista de roletas com registro de ganhos por horário.

## Deploy

- **Backend**: Render, Railway ou Fly.io (Express tradicional + Mongo). Configure as mesmas variáveis de ambiente do `.env`.
- **Frontend**: Vercel (já configurado com `vercel.json`). Configure `VITE_API_URL` apontando para a URL pública do backend, e `CORS_ORIGIN` no backend apontando para a URL pública do frontend.

Veja os READMEs de cada projeto para mais detalhes.

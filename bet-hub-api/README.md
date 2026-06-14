# BetHub API 🎯

Backend (Node + Express + TypeScript + Mongoose) para o BetHub. Conecta no **MongoDB Atlas**, com autenticação de usuário comum e admin, registro de spins (roleta/ganhos/horário) e gerenciamento de casas de apostas.

## Setup

```bash
npm install
cp .env.example .env
```

Edite o `.env`:

```
MONGO_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/bethub?retryWrites=true&w=majority
JWT_SECRET=algo-bem-grande-e-aleatorio
PORT=4000
CORS_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@bethub.com
ADMIN_PASSWORD=senha-forte-aqui
ADMIN_NAME=Admin
```

### Criar o admin inicial

```bash
npm run seed:admin
```

### Popular as casas de apostas iniciais

```bash
npm run seed:houses
```

### Rodar em dev

```bash
npm run dev
```

### Build e produção

```bash
npm run build
npm start
```

---

## Autenticação

Todas as rotas protegidas usam JWT no header:

```
Authorization: Bearer <token>
```

### `POST /api/auth/register`
Cria uma conta de usuário comum.

```json
{ "name": "João", "email": "joao@email.com", "password": "123456" }
```

→ `201 { token, user }`

### `POST /api/auth/login`
```json
{ "email": "joao@email.com", "password": "123456" }
```

→ `200 { token, user }`

### `GET /api/auth/me`
Retorna o usuário autenticado.

---

## Casas de apostas

### `GET /api/houses`
Público. Lista todas as casas (id, name, url, roletas, active, note, order).

### `POST /api/houses` (admin)
```json
{
  "id": "novacasa",
  "name": "Nova Casa",
  "url": "https://novacasa.bet.br/",
  "roletas": [{ "label": "Roleta", "url": "https://novacasa.bet.br/" }],
  "active": true,
  "note": "opcional",
  "order": 21
}
```

### `PATCH /api/houses/:id` (admin)
Atualiza qualquer campo da casa (parcial). `:id` é o slug (ex: `lotogreen`).

### `DELETE /api/houses/:id` (admin)
Remove a casa.

---

## Spins (roletas jogadas / ganhos)

### `POST /api/spins`
Usuário registra um spin feito.

```json
{
  "houseId": "lotogreen",
  "roletaLabel": "Roleta 1",
  "amount": 50,
  "playedAt": "2026-06-12T14:32:00.000Z"
}
```
`amount` e `playedAt` são opcionais (`amount` default 0, `playedAt` default agora).

→ `201 { spin }`

### `GET /api/spins/me`
Histórico do próprio usuário. Query params opcionais: `from`, `to` (ISO date), `houseId`, `limit`.

→ `{ spins, totalGanho, count }`

### `GET /api/spins/me/today`
Resumo do dia atual (para a barra de progresso / botões já marcados).

→ `{ spins, totalGanhoHoje, date }`

---

## Admin

Todas as rotas abaixo exigem `role: admin`.

### `GET /api/admin/users`
Lista todos os usuários.

### `GET /api/admin/earnings`
Visão geral: para cada usuário, `totalGanho`, `totalSpins`, `ganhoHoje`, `spinsHoje`, `lastPlayedAt`. Ordenado por maior ganho total.

### `GET /api/admin/users/:userId/spins`
Histórico completo de spins de um usuário. Query params: `from`, `to`, `houseId`, `limit`.

### `PATCH /api/admin/users/:userId/role`
Promove/remove admin.

```json
{ "role": "admin" }
```

---

## Modelos

**User**: `name`, `email`, `passwordHash`, `role` (`user` | `admin`)

**House**: `id` (slug), `name`, `url`, `roletas: [{ label, url }]`, `active`, `note?`, `order`

**Spin**: `user`, `houseId`, `houseName`, `roletaLabel`, `amount`, `currency`, `playedAt`

---

## Deploy

Funciona em qualquer host Node (Render, Railway, Fly.io, etc). Para Vercel (serverless), seria necessário adaptar para functions — recomendo Render/Railway para manter o Express tradicional com conexão persistente ao Mongo.

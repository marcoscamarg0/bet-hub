# BetHub 🎯

Frontend (Vite + React + TypeScript) do BetHub — lista de casas de apostas com roleta diária, login, e painel admin. Consome a API em [`bet-hub-api`](../bet-hub-api).

## Setup

```bash
npm install
cp .env.example .env
```

Edite o `.env` com a URL do backend:

```
VITE_API_URL=http://localhost:4000
```

## Rodar

```bash
npm run dev
```

Acesse: http://localhost:5173

## Funcionamento

- **Login/Cadastro** — tela inicial pede email e senha. Novas contas são criadas como `user`.
- **Lista de casas** — carregada de `GET /api/houses` (com fallback para `src/data.ts` se a API estiver fora do ar).
- **Marcar roleta feita** — ao clicar numa roleta, abre um modal pedindo o valor ganho. Isso registra um `POST /api/spins` com `{ houseId, roletaLabel, amount, playedAt }`.
- **Progresso do dia** — carregado de `GET /api/spins/me/today` ao abrir o site, e reseta automaticamente à meia-noite (client-side).
- **Painel Admin** — visível apenas para usuários com `role: admin`. Permite:
  - Criar, editar, ativar/desativar e remover casas de apostas
  - Ver ganhos de todos os usuários (total, hoje, nº de spins) e o histórico detalhado de cada um

## Criando o primeiro admin

No backend, rode:

```bash
npm run seed:admin
```

usando o `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos no `.env` do backend. Depois faça login com essas credenciais — o botão "Admin" aparecerá no topo.

## Editar casas localmente (fallback offline)

Se a API estiver indisponível, o site usa `src/data.ts` como dados de fallback (somente leitura, sem progresso salvo). Edite esse arquivo do mesmo jeito de antes para manter o fallback atualizado.

## Tecnologias

- **Vite** + **React** + **TypeScript**
- CSS Modules
- Fontes: Geist Mono + Inter
- Roleta meme em `<canvas>`

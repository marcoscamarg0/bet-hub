# 🔗 Como Conectar Frontend ↔ Backend (BetHub)

## Arquitetura

```
bet-hub/          ← Frontend React + Vite (este projeto)
bet-hub-api/      ← Backend Node.js + Express + MongoDB
```

---

## 1. Configurar o Backend (`bet-hub-api`)

### Pré-requisitos
- Node.js 18+
- Conta no [MongoDB Atlas](https://cloud.mongodb.com) (gratuito)

### Passos

```bash
cd bet-hub-api

# 1. Instalar dependências
npm install

# 2. Criar arquivo .env (copiar do exemplo)
cp .env.example .env
```

Edite o `.env`:
```env
# Cole aqui a string do MongoDB Atlas
# Exemplo: mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/bethub
MONGO_URI=mongodb+srv://SEU_USER:SUA_SENHA@cluster0.xxxxx.mongodb.net/bethub?retryWrites=true&w=majority

# Troque por uma string longa e aleatória (segredo do JWT)
JWT_SECRET=mude-para-algo-muito-secreto-123456789

# Porta do servidor
PORT=4000

# URL do frontend (para CORS)
CORS_ORIGIN=http://localhost:5173
```

```bash
# 3. Iniciar o servidor em modo desenvolvimento
npm run dev

# ✅ Você verá:
# ✅ Conectado ao MongoDB Atlas
# 🚀 BetHub API rodando na porta 4000
```

### Criar o admin inicial (opcional — o login de admin é automático)
O admin padrão é criado automaticamente no primeiro login com:
- **Usuário:** `mestredosmijos`
- **Senha:** `123Night!`

Para popular as casas de apostas no banco:
```bash
npm run seed:houses
```

---

## 2. Configurar o Frontend (`bet-hub`)

```bash
cd bet-hub

# 1. Instalar dependências
npm install

# 2. Criar o .env (uma linha só)
echo "VITE_API_URL=http://localhost:4000" > .env

# 3. Iniciar o frontend
npm run dev

# ✅ Acesse: http://localhost:5173
```

---

## 3. Deploy em Produção

### Backend → Render.com (gratuito)

1. Acesse [render.com](https://render.com) → New → Web Service
2. Conecte o repositório GitHub
3. Configure:
   - **Root Directory:** `bet-hub-api`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/server.js`
4. Em **Environment Variables**, adicione:
   - `MONGO_URI` → sua string do MongoDB Atlas
   - `JWT_SECRET` → string longa e aleatória
   - `CORS_ORIGIN` → URL do seu frontend (ex: `https://bet-hub.vercel.app`)
5. Deploy! Anote a URL gerada (ex: `https://bet-hub-api.onrender.com`)

### Frontend → Vercel (gratuito)

1. Acesse [vercel.com](https://vercel.com) → New Project
2. Importe o repositório GitHub
3. Configure:
   - **Root Directory:** `bet-hub`
   - **Framework:** Vite
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL` → URL da API no Render (ex: `https://bet-hub-api.onrender.com`)
5. Deploy!

---

## 4. Variáveis de Ambiente — Resumo

| Arquivo | Variável | Valor em Dev | Valor em Prod |
|---|---|---|---|
| `bet-hub-api/.env` | `MONGO_URI` | string do Atlas | string do Atlas |
| `bet-hub-api/.env` | `JWT_SECRET` | qualquer string | string secreta longa |
| `bet-hub-api/.env` | `CORS_ORIGIN` | `http://localhost:5173` | URL do Vercel |
| `bet-hub/.env` | `VITE_API_URL` | `http://localhost:4000` | URL do Render |

---

## 5. Testar a Conexão

```bash
# Verificar se o backend está rodando:
curl http://localhost:4000/api/health
# Resposta esperada: {"ok":true}

# Testar login:
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"mestredosmijos","password":"123Night!"}'
```

---

## 6. Problemas Comuns

### "Modo offline" aparece no frontend
→ O backend não está rodando ou a `VITE_API_URL` está errada.
→ Abra o console do browser (F12) e veja o erro de rede.

### CORS Error no browser
→ No backend, confirme que `CORS_ORIGIN` está igual à URL do frontend.

### "JWT_SECRET não definido"
→ O arquivo `.env` do backend não existe ou não tem a variável `JWT_SECRET`.

### MongoDB connection failed
→ Verifique se o IP do servidor está liberado no MongoDB Atlas
→ Atlas → Network Access → Add IP Address → `0.0.0.0/0` (libera todos)

# Regras de Código

## Backend (Node.js + Express)

✅ **Obrigatório:**
- `async/await` em todo o código — sem callbacks
- `try/catch` em todo controller — erro retorna `{ message: "..." }`
- Senhas: `bcryptjs` com salt 12 — nunca texto puro
- Variáveis: SEMPRE via `process.env` — nunca hardcoded
- Respostas de erro: **400 / 401 / 403 / 404 / 500** com mensagem coerente
- `valor_final` de faturas: calculado na query SQL, nunca persistido como coluna
- Estrutura: `config/`, `middlewares/`, `routes/`, `controllers/`, `models/`, `services/`

❌ **Proibido:**
- Callbacks
- Variáveis hardcoded
- Senhas em texto puro
- Lógica de negócio em routes

## Frontend (React + Tailwind)

✅ **Obrigatório:**
- Access token NUNCA em `localStorage` — apenas React Context
- Todo fetch via instância Axios em `services/api.js` — nunca `fetch()` direto
- Interceptor: `401` → `POST /auth/refresh` → reenviar original → falha → `logout()` + `/login`
- Erro `403 code=INADIMPLENTE` em `/aluno/*` → exibir tela de bloqueio
- Erros exibidos via toast: `response.data.message`
- Componentes próprios em `src/components/ui/` — sem shadcn/ui
- Estrutura: `context/`, `services/`, `components/`, `pages/`

❌ **Proibido:**
- `localStorage` para token
- `fetch()` direto — sempre Axios
- shadcn/ui
- Hardcoded URLs de API
- Token em query string ou cookie visível ao JS

## Deploy

Variáveis de ambiente CRÍTICAS:
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://:pass@cache:6379
JWT_SECRET=<algo forte, 32+ chars>
JWT_REFRESH_SECRET=<algo forte, 32+ chars>
NODE_ENV=production
RESEND_API_KEY=<chave Resend>
EMAIL_FROM=noreply@seu-dominio.com
PORT=3001 (ou outro)
```

Nunca commitar `.env` — usar variáveis de ambiente do container.

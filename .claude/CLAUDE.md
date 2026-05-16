# Coach System — Contexto do projeto

> Este arquivo é lido automaticamente pelo Claude Code em toda sessão.
> Qualquer agente que atuar neste projeto deve seguir estas regras sem exceção.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Front-end | React + React Router + shadcn/ui + Tailwind CSS |
| Back-end | Node.js + Express |
| Banco de dados | PostgreSQL |
| Cache / Sessões | Redis (ioredis) |
| Autenticação | JWT — access token em memória, refresh token em cookie httpOnly |
| Containerização | Docker — imagens customizadas para frontend e backend |
| Orquestração | Docker Swarm |

---

## Infraestrutura — Docker Swarm

### Regra fundamental de placement
- `database` (postgres:16-alpine) e `cache` (redis:7-alpine) → **imagens públicas prontas**, rodam **apenas no nó manager** (`node.role == manager`)
- `backend` e `frontend` → **imagens customizadas** (build via Dockerfiles), rodam nos **workers** (`node.role == worker`) e são **replicáveis para escalar**

### Estrutura de arquivos Docker
```
coach-system/
├── docker/
│   ├── frontend.Dockerfile    ← multi-stage: node build + nginx serve
│   └── backend.Dockerfile     ← multi-stage: install + imagem enxuta
├── docker-compose.yml         ← stack completa do Swarm
└── .env                       ← variáveis sensíveis (nunca commitar)
```

### Rede interna
Todos os serviços se comunicam pela rede overlay `coach_network`.
Os containers se encontram pelo **nome do serviço** — nunca por IP:
- Back-end conecta no banco via: `postgres://user:pass@database:5432/db`
- Back-end conecta no Redis via: `redis://:pass@cache:6379`
- Nenhuma porta de banco ou cache é exposta ao host

### Variáveis de ambiente no back-end
O `backend` recebe todas as configs via environment no `docker-compose.yml`:
```
DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, PORT, NODE_ENV
```
O código Node.js lê via `process.env` — nunca hardcoded.

### Regras para os agentes sobre Docker
- **agente-api**: o `db.js` deve usar `process.env.DATABASE_URL` para a connection string do pg.Pool. O `redis.js` deve usar `process.env.REDIS_URL` para o ioredis. Zero config hardcoded.
- **agente-ui**: o `frontend.Dockerfile` usa nginx para servir o build estático. O React deve ter `VITE_API_URL` no `.env` apontando para o backend. Requisições da API usam essa variável.
- **Nenhum agente** cria ou modifica arquivos Docker — isso é responsabilidade do desenvolvedor humano seguindo o `docker-setup.md`.

---

## Perfis de usuário

| Role | Acesso |
|------|--------|
| `admin` | Dashboard de gerência, módulos de alunos, exercícios, alimentos, cardio, protocolos |
| `aluno` | Apenas área própria — perfil, plano, status |

Regra crítica: aluno jamais acessa rota ou componente de admin. A separação é feita no middleware do back-end (`authorize.js`) e no `PrivateRoute` do front-end.

---

## Regras de autenticação

- JWT access token: expira em **1 hora**, armazenado **apenas em React Context** (nunca em localStorage ou sessionStorage)
- Refresh token: expira em **7 dias**, armazenado em **cookie httpOnly** (o front-end nunca o lê diretamente)
- Redis guarda **blacklist de tokens invalidados** — ao fazer logout ou desativar um aluno, o access token vai para a blacklist com TTL igual ao tempo restante
- Axios interceptor no front-end renova o access token automaticamente via `/api/auth/refresh` antes de qualquer requisição com token expirado

---

## Regras de código — back-end

- `async/await` em todo o código, **sem callbacks**
- `try/catch` em todo controller — erros retornam `{ message: "..." }` em JSON
- Senhas: `bcryptjs` com **salt 12** — nunca armazenar texto puro
- Variáveis de ambiente: **sempre via `.env`** — nunca hardcoded
- Respostas de erro padronizadas:
  - `400` Bad Request — dados inválidos
  - `401` Unauthorized — sem token ou token inválido
  - `403` Forbidden — token válido mas role sem permissão
  - `404` Not Found — recurso não existe
  - `500` Internal Server Error — erro inesperado

---

## Regras de código — front-end

- Access token **nunca no localStorage** — apenas em React Context
- Todo fetch via instância do Axios em `services/api.js` — nunca `fetch()` direto
- Interceptor de refresh implementado em `services/api.js`
- Rotas protegidas via `components/PrivateRoute.jsx` com checagem de role
- Após login, redirecionar conforme role:
  - `admin` → `/admin/dashboard`
  - `aluno` → `/aluno/perfil`

---

## Design system — identidade visual

**Estilo:** Bold & Energético — inspiração crossfit / Nike Training / apps de alta performance.

### Proibido em qualquer componente

- ❌ Fundo branco ou cinza claro como base da aplicação
- ❌ Azul padrão de SaaS
- ❌ Sombras decorativas ou gradientes coloridos
- ❌ Componentes shadcn com tema padrão claro sem sobrescrever
- ❌ `font-weight` abaixo de 400 ou título sem `font-weight: 800+`
- ❌ JWT em localStorage

### Paleta (definida em tailwind.config.js)

```js
colors: {
  brand: {
    DEFAULT: '#f97316',  // laranja principal
    dark:    '#ea6c0a',  // hover
    light:   '#fed7aa',  // fundo suave
  },
  surface: {
    DEFAULT: '#0a0a0a',  // fundo da app
    card:    '#111111',  // sidebar e cards
    elevated:'#161616',  // cards elevados
    border:  '#1f1f1f',  // bordas
    input:   '#1a1a1a',  // inputs
  },
}
```

### Tokens obrigatórios

| Elemento | Classe Tailwind |
|----------|----------------|
| Fundo da app | `bg-surface` |
| Sidebar / cards | `bg-surface-card` |
| Cards elevados | `bg-surface-elevated` |
| Bordas | `border-surface-border` |
| Inputs | `bg-surface-input` |
| Cor primária | `text-brand` / `bg-brand` |
| Texto principal | `text-white` |
| Texto secundário | `text-zinc-400` |
| Labels / muted | `text-zinc-600` |
| Status ativo | `bg-green-950 text-green-400` |
| Status vencido / erro | `bg-red-950 text-red-400` |

### Tipografia

| Uso | Classes |
|-----|---------|
| Título de página | `text-2xl font-black tracking-tight text-white` |
| Título de seção | `text-xs font-bold uppercase tracking-widest text-zinc-500` |
| Valor de métrica | `text-3xl font-black text-brand` |
| Corpo / tabelas | `text-sm text-zinc-300` |

### Componentes padrão

**Botão primário:**
```jsx
<Button className="bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-wide text-xs px-4 py-2 rounded-md">
```

**Badge ativo:**
```jsx
<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-950 text-green-400">Ativo</span>
```

**Badge vencido:**
```jsx
<span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950 text-red-400">Vencido</span>
```

**Card de métrica:**
```jsx
<div className="bg-surface-elevated border border-surface-border rounded-xl p-4">
  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Label</p>
  <p className="text-3xl font-black text-brand">48</p>
</div>
```

**Avatar de aluno:**
```jsx
<div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-xs font-black text-white">RM</div>
```

**Input:**
```jsx
<Input className="bg-surface-input border-surface-border text-white placeholder:text-zinc-600 focus:border-brand focus:ring-brand" />
```

**Sidebar item ativo:**
```jsx
<div className="flex items-center gap-3 px-5 py-2.5 text-sm text-white bg-surface-elevated border-l-2 border-brand">
```

**Sidebar item inativo:**
```jsx
<div className="flex items-center gap-3 px-5 py-2.5 text-sm text-zinc-500 border-l-2 border-transparent hover:text-zinc-300 cursor-pointer">
```

---

## Arquivos de contrato (fonte da verdade entre agentes)

| Arquivo | Produzido por | Consumido por |
|---------|--------------|--------------|
| `docs/schema.sql` | agente-db | agente-api |
| `docs/api-contract.md` | agente-db + agente-api | agente-ui |
| `docs/ui-contract.md` | agente-api | agente-ui |

**Regra:** nenhum agente inventa campos ou rotas. Se não estiver no contrato, pergunta antes de prosseguir.

---

## Deploy

| Serviço | Container | Placement |
|---------|-----------|-----------|
| Frontend | `coach-frontend:latest` (imagem customizada) | Workers — replicável |
| Backend | `coach-backend:latest` (imagem customizada) | Workers — replicável |
| PostgreSQL | `postgres:16-alpine` (imagem pública) | Manager — fixo |
| Redis | `redis:7-alpine` (imagem pública) | Manager — fixo |

Orquestração via **Docker Swarm**. Referência completa: `docker-setup.md`

## Stack
- Front-end: React + React Router + Axios
- Back-end: Node.js + Express
- Banco: PostgreSQL
- Cache/Sessões: Redis
- Auth: JWT (access token em memória, refresh token em cookie httpOnly)

## Perfis de usuário
- admin: gerencia alunos, registra pagamentos, ativa/desativa contas
- aluno: vê apenas seu próprio perfil e status do plano

## Regras críticas de código
- Nunca armazenar senha em texto puro (usar bcryptjs, salt 12)
- Nunca hardcodar variáveis sensíveis (sempre via .env)
- JWT access token: 1 hora. Refresh token: 7 dias em cookie httpOnly
- Redis guarda blacklist de tokens invalidados
- Todo erro deve retornar JSON com campo "message"
- Usar async/await em todo o back-end, sem callbacks

## Arquivos de contrato
- docs/schema.sql → schema oficial do banco (não alterar sem atualizar este arquivo)
- docs/api-contract.md → lista de todas as rotas com request/response esperados
- docs/ui-contract.md → o que o front-end consome da API
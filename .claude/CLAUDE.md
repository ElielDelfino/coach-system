# Coach System — Contexto do projeto

> Este arquivo é lido automaticamente pelo Claude Code em toda sessão.
> Qualquer agente que atuar neste projeto deve seguir estas regras sem exceção.

---

## Essencial do projeto

| Aspecto | Informação |
|---------|-----------|
| **Tipo** | Sistema de coaching — admin + alunos |
| **Status** | Em produção com Docker Swarm |
| **Banco** | PostgreSQL 16 |
| **Linguagens** | React (frontend) + Node.js/Express (backend) |
| **Autenticação** | JWT — access token em Context, refresh em httpOnly cookie |
| **Estado financeiro** | Faturas (não pagamentos) — alunos inadimplentes bloqueados |

---

## Stack resumido

@docs/STACK.md

---

## Banco de dados & migrações

@docs/DATABASE.md

---

## Autenticação & autorização

@docs/AUTH.md

---

## Regras de código

@docs/CODE-RULES.md

---

## Design system

**Paleta:** Brand `#f97316` em fundo escuro (`#0a0a0a`)  
**Estilo:** Bold & energético (Nike Training / crossfit)  
**Tokens obrigatórios:**
- Fundo: `bg-surface` | Cards: `bg-surface-card` | Inputs: `bg-surface-input`
- Texto: `text-white` (principal) | `text-zinc-400` (secundário)
- Labels: `text-xs uppercase tracking-widest text-zinc-600`
- Status badges: `bg-{color}-950 text-{color}-400` (verde/vermelho/amarelo/cinza)

**Proibido:** Fundo branco/cinza claro, azul SaaS padrão, JWT em localStorage, fetch() direto, senha em texto puro, variáveis hardcoded.

---

## Contratos & documentação

- `docs/schema.sql` — Schema + migrações M001-M005, M008, M009
- `docs/api-contract.md` — Todas as rotas (body + response)
- `docs/ui-contract.md` — Shapes JSON do frontend
- `docker-setup.md` — Comandos Docker completos

**Regra crítica:** Nenhum agente inventa campos ou rotas. Se não estiver no contrato, perguntar antes.

---

## Próximas tarefas / estado atual

_Atualize isso quando iniciar novo chat. Continuação completa do trabalho em [@prompts/HANDOFF.md]._

**Última sessão (2026-05-20): Bloco 2 — frontend confiável**
- `frontend/src/components/ErrorBoundary.jsx` (class component) criado e envolvendo o root em `main.jsx` por fora de `BrowserRouter`. Mostra `error.stack` em DEV; CTAs "Tentar de novo" (reset) e "Recarregar" no estilo visual do projeto.
- ESLint + Prettier configurados em `frontend/` e `backend/`. Frontend: `eslint`, `eslint-config-prettier`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`. Backend: `eslint`, `eslint-config-prettier`, `prettier`. Scripts `lint`, `lint:fix`, `format`, `format:check` em ambos.
- Baseline frontend: 0 errors, 10 warnings tolerados (limpar incrementalmente). Baseline backend: clean (0/0) — `lint:fix` removeu 3 `eslint-disable` órfãos em `ProtocoloBuilder.jsx` e import órfão `alunoModel` em `authController.js`.

**Sessão (2026-05-20): Bloco 3 — validação backend com zod**
- `zod@^3.25.76` adicionado. Middleware `src/middlewares/validate.js` (factory `validate(schema, source='body')`) faz `schema.parse(req[source])`, retorna 400 com `{ message, errors:[{path,message}] }` se falhar.
- `src/schemas/` criado com 14 arquivos (`_common.js` + 13 de domínio: alunos, medidas, fotos, pagamentos, faturas, exercicios, alimentos, cardio, protocolos, refeicoes, treinos, suplementacao, auth). Espelham os controllers.
- 30 rotas POST/PUT/PATCH em `routes/admin.js` + `/login` em `routes/auth.js` agora têm `validate(schema)` antes do handler. Controllers limpos das validações manuais — só checks de existência de recurso (404) permanecem.
- Recursos zod usados: `z.discriminatedUnion` (createTreinoExercicio), `.superRefine` (data_fim >= data_inicio), `z.coerce.number` (campos numéricos), enums centralizados (METODOS/FASES/UNIDADES/NIVEIS/INTENSIDADES).

**Sessão (2026-05-20): Bloco 1 — production safety**
- `pg_advisory_lock(4242424242)` em `migrate.js` e `seed.js` — réplicas serializam no boot (corrige race condition no Swarm).
- Healthcheck no serviço `backend` do `docker-compose.yml` apontando para `GET /health` via `node -e http.get(...)`.
- `envalid@8.1.1` valida env vars críticos no boot (`backend/src/config/env.js`): falha cedo se faltar `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `REDIS_URL`, `AWS_*`.

**Sessão anterior (2026-05-19): refatoração estrutural**
- Removidos `node_modules` do controle de versão (5224 arquivos).
- Backend hardening: `helmet`, `express-rate-limit` (login 10/15min, api 120/min), `express.json` com 1mb, `GET /health`, `trust proxy` em `server.js`.
- `docs/api-contract.md` e `docs/ui-contract.md` reescritos/atualizados — alinhados com o código real (8 endpoints faltantes adicionados, status do aluno corrigido para 4 estados, faturas documentadas).
- Frontend: `AlunoShell` agora usa `<Outlet/>` + nested route. `AlunoLayout` deriva página ativa por `useLocation()`. As 4 páginas (`Home/Treino/Dieta/Perfil`) não importam mais o layout.
- Backend: `controllers/adminController.js` (1298l) → 13 arquivos em `controllers/admin/`.
- Backend: `models/aluno.js` (1325l) → 14 arquivos em `models/` + `_shared.js` (helpers cross-domínio) + `index.js` (barrel). Padrão "uma tabela = um arquivo" documentado em `docs/CODE-RULES.md`.
- Controllers importam `require('../../models')` (barrel) — futuras divisões são transparentes.

**Estado de produção:** Nada foi deployado ainda. Tudo aplicado localmente, sem commit.

**Próximas tarefas (priorizadas) — ver detalhes em [@prompts/HANDOFF.md]:**
1. Páginas frontend gigantes: `AlunoDetalhe.jsx` (2046l) e `ProtocoloBuilder.jsx` (2030l) — quebrar em subcomponentes.
2. Cache em Redis (60s) do status de inadimplência no `middlewares/auth.js`.
3. Pool tuning no `pg` (`backend/src/config/db.js`).
4. Frontend bundle de 849kb sem code-splitting — lazy-load das rotas admin.

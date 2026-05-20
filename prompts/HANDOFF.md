# HANDOFF — Coach System (refatoração pré-produção)

> **Para colar como primeiro prompt do próximo chat.**
> Este documento é o estado completo do trabalho de organização do projeto.
> Data da última sessão: **2026-05-20**.

---

## 0. Como usar este handoff

Cole este arquivo inteiro no início do próximo chat. Ele dá ao Claude:
- O que já foi feito (para não refazer)
- O que está pendente (priorizado)
- O plano sugerido para cada item
- Comandos de verificação para confirmar o estado

O `CLAUDE.md` na raiz já referencia este arquivo. Os contratos em `docs/api-contract.md` e `docs/ui-contract.md` estão atualizados — não invente rotas.

---

## 1. Contexto

Projeto **Coach System** em produção com Docker Swarm. React (Vite) + Node.js/Express + PostgreSQL 16 + Redis + S3. Auth JWT (access em memória, refresh em cookie httpOnly).

Na sessão de 2026-05-19 fiz uma auditoria completa e atacamos a primeira leva de problemas estruturais antes de o projeto crescer mais. Falta uma segunda leva.

---

## 2. O que foi feito até agora (não commitado ainda)

### Sessão 2026-05-20 — Bloco 2 (frontend confiável)

#### 2.C1 ErrorBoundary no React
- `frontend/src/components/ErrorBoundary.jsx` criado como class component (único caminho oficial pra `componentDidCatch` no React 18). Renderiza tela de erro no padrão visual do `ErrorState` (bg `red-950/20`, ícone ⚠️, brand orange CTA) com dois botões: **Tentar de novo** (reset do state, re-tenta renderizar a árvore) e **Recarregar** (`window.location.reload()`).
- Em `import.meta.env.DEV` mostra o `error.stack` em `<pre>` colapsável (some em prod).
- `frontend/src/main.jsx`: `<ErrorBoundary>` envolve `<BrowserRouter>` → `<AuthProvider>` → `<App/>`. Mantido `<React.StrictMode>` como camada externa.

#### 2.C2 ESLint + Prettier no frontend
- DevDeps: `eslint@^8.57.0`, `eslint-config-prettier@^9.1.0`, `eslint-plugin-react@^7.34.0`, `eslint-plugin-react-hooks@^4.6.0`, `eslint-plugin-react-refresh@^0.4.5`, `prettier@^3.2.5`.
- `frontend/.eslintrc.cjs`: extends `eslint:recommended`, `plugin:react/recommended`, `plugin:react/jsx-runtime` (React 17+ — sem `React in scope` warning), `plugin:react-hooks/recommended`, `prettier`. Plugin `react-refresh` com `only-export-components: warn`. Regras: `react/prop-types: off`, `react/no-unescaped-entities: off`, `no-unused-vars: warn` (ignora `_` prefix), `no-empty: error` (permite catch vazio). `settings.react.version: '18.2'`.
- `frontend/.prettierrc`: `semi: true`, `singleQuote: true`, `trailingComma: es5`, `printWidth: 100`, `tabWidth: 2`, `arrowParens: always`, `endOfLine: lf`. `.prettierignore` cobre `dist/`, `build/`, `node_modules/`, `package-lock.json`.
- Scripts: `lint`, `lint:fix`, `format`, `format:check`. O `lint` usa `--report-unused-disable-directives` (autocorrigível por `lint:fix` — já removeu 3 `// eslint-disable-next-line` órfãos em `ProtocoloBuilder.jsx` linhas 171/1083). Sem `--max-warnings 0` por enquanto: baseline tem 10 warnings legítimos (hooks deps, vars `_y` em destructure de recharts, fast-refresh em `Toast.jsx`/`AuthContext.jsx`/`ui/Toast.jsx`) — limpar incrementalmente.
- `vite build` continua passando em ~3.5s.

#### 2.C3 ESLint + Prettier no backend
- DevDeps: `eslint@^8.57.0`, `eslint-config-prettier@^9.1.0`, `prettier@^3.2.5`.
- `backend/.eslintrc.cjs`: extends `eslint:recommended` + `prettier`. `env: { node: true, es2022: true }`, `sourceType: 'script'` (CJS). `no-unused-vars: warn` ignora `_` prefix (inclusive `caughtErrors`). `no-console: off` (logger ainda não migrado — item C2).
- Mesma config Prettier do frontend (cópia).
- Bonus: removido import órfão `alunoModel = require('../models')` em `controllers/authController.js` (que ESLint pegou na hora). Lint final: **0 warnings, 0 errors**.

#### 2.C4 Verificação Bloco 2
- `cd frontend && npm run lint` → 10 warnings, 0 errors.
- `cd frontend && npm run build` → `dist/` gerado em 3.54s (850kb bundle — item B4 segue pendente).
- `cd backend && npm run lint` → clean.
- Smoke test pós-edit ainda passa: `models: 76, admin: 78, auth: 3`.

---

### Sessão 2026-05-20 — Bloco 3 (validação backend com zod)

#### 2.B1 Dep `zod` e middleware `validate`
- Nova dep `zod@^3.25.76` em `backend/package.json`.
- `backend/src/middlewares/validate.js`: factory `validate(schema, source='body')` que faz `schema.parse(req[source])` e injeta o resultado de volta em `req[source]`. Em erro: `400` com `{ message: "campo: motivo; outro: motivo", errors: [{ path, message }] }`. Mantém `message` para compatibilidade com toasts existentes e adiciona `errors[]` para evolução do frontend.

#### 2.B2 Schemas por domínio em `backend/src/schemas/`
- `_common.js`: helpers reutilizáveis (`nonEmptyStr`, `optionalStr`, `isoDate`, `positiveInt`, `positiveNumber`, `nonNegativeNumber`, etc).
- 13 arquivos de schema (espelham controllers): `alunos.js`, `medidas.js`, `fotos.js`, `pagamentos.js`, `faturas.js`, `exercicios.js`, `alimentos.js`, `cardio.js`, `protocolos.js`, `refeicoes.js`, `treinos.js`, `suplementacao.js`, `auth.js`.
- `treinos.createTreinoExercicio` usa `z.discriminatedUnion('tipo', [...])` — diferencia body de `exercicio` vs `cardio` e exige o campo `_id` correspondente.
- `protocolos.createProtocolo/updateProtocolo` usa `.superRefine()` para validar `data_fim >= data_inicio`.
- `refeicoes.reordenarItens` / `treinos.reordenarTreinoExercicios` validam `Array<{id: uuid, ordem: int>=0}>` não-vazio.
- Enums centralizados nos schemas: `METODOS` (pagamento), `TIPOS_DESCONTO`, `FASES`, `UNIDADES`, `NIVEIS`, `INTENSIDADES`, `sexo`.

#### 2.B3 Aplicação nas rotas
- `routes/admin.js`: 30 rotas POST/PUT/PATCH ganharam `validate(schema)` antes do controller. Lista das que **não** validam (intencionalmente):
  - `GET *` (escopo: só body)
  - `PATCH .../ativar`, `.../desativar` (body vazio)
  - `DELETE *` (sem body)
  - `PUT /exercicios/:id/thumbnail`, `/video`, `/alimentos/:id/foto` (multipart, validação no middleware `upload`)
  - `POST /protocolos/:id/enviar-pdf` (body vazio)
- `routes/auth.js`: `POST /login` valida `{ email, senha }`. `/refresh` e `/logout` continuam sem schema (token vem de cookie/header, não de body).

#### 2.B4 Limpeza de controllers
- Removidos checks manuais `if (!nome || !email)`, `if (Number(valor) <= 0)`, `if (!['exercicio','cardio'].includes(tipo))`, etc — agora vivem no schema.
- **Mantidos** checks de existência de recurso (`if (!aluno) return 404`) — esses são lookups DB, não validação de input.
- Constantes `METODOS` / `TIPOS_DESCONTO` removidas dos controllers de pagamentos/faturas (movidas para schemas).
- Mensagens de erro de validação agora vêm uniformes do zod, em vez de strings ad-hoc por controller.

#### 2.B5 Verificação Bloco 3
- `node --check` passa em todos os arquivos novos/editados.
- Smoke test: `models: 76`, `rotas admin: 78`, `rotas auth: 3`, todos os 13 schemas carregam.
- Testes de validação reais:
  - `createAluno {}` → 400 com 3 erros (`nome: Required`, `email: Required`, `senha: Required`).
  - `createAluno { senha: '12345' }` → 400 (`senha deve ter no mínimo 8 caracteres`).
  - `createTreinoExercicio { tipo: 'foo' }` → 400 (`Invalid discriminator value`).
  - `createTreinoExercicio { tipo: 'exercicio' }` → 400 (`exercicio_id: Required`).
  - `reordenarItens { ordem: [] }` → 400 (`ordem deve ser um array não vazio`).
  - `reordenarItens { ordem: [{ id: 'not-uuid', ordem: -1 }] }` → 400 com paths `ordem.0.id` e `ordem.0.ordem`.

---

### Sessão 2026-05-20 — Bloco 1 (production safety)

#### 2.A1 `pg_advisory_lock` no boot — corrige race condition do Swarm
- `backend/src/config/migrate.js`: envolve toda a lógica em `SELECT pg_advisory_lock(4242424242)` no início e `pg_advisory_unlock` no `finally`. Exporta `BOOT_LOCK_KEY` para reuso.
- `backend/src/config/seed.js`: usa a mesma `BOOT_LOCK_KEY` importada de `migrate.js`. As 2 réplicas agora serializam o boot — só uma migra/seed por vez.
- Chave escolhida: `4242424242` (bigint arbitrário, único na app — não conflita com nada).

#### 2.A2 Healthcheck no `docker-compose.yml`
- Serviço `backend` agora tem bloco `healthcheck`:
  ```yaml
  healthcheck:
    test: ["CMD","node","-e","require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
    interval: 30s
    timeout: 5s
    retries: 3
    start_period: 30s
  ```
- Usa `node` (já existe na imagem) — evita instalar `wget`/`curl` no Alpine.

#### 2.A3 `envalid` valida env vars no boot
- Nova dep `envalid@8.1.1` em `backend/package.json`.
- `backend/src/config/env.js`: validação completa das vars críticas. Server **não sobe** se faltar:
  - `DATABASE_URL`, `REDIS_URL` (url)
  - `JWT_SECRET`, `JWT_REFRESH_SECRET` (str)
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` (str)
- Opcionais com default: `PORT` (3000), `NODE_ENV` (`development`), `FRONTEND_URL` (`http://localhost:5173`), `S3_PUBLIC_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `PUPPETEER_EXECUTABLE_PATH`.
- `backend/server.js`: `require('./src/config/env')` na 2ª linha (logo após `dotenv`).

#### 2.A4 Verificação Bloco 1
- `node --check` passa em `server.js`, `migrate.js`, `seed.js`, `env.js`.
- `docker compose config --quiet` valida (avisa só do `version: "3.9"` obsoleto — item C4, cosmético).
- Boot sem env vars → envalid lista as 8 faltantes em um bloco colorido e sai com código 1.
- Boot com env vars válidas → barrel carrega `76 models`, router admin tem `78 rotas`, `BOOT_LOCK_KEY=4242424242` exportada corretamente.

---

### Sessão 2026-05-19 — refatoração estrutural

#### 2.1 Git & infra
- `git rm -r --cached backend/node_modules frontend/node_modules` — 5224 arquivos destrackeados (continuam no disco). `.gitignore` já cobria, só não tinha sido aplicado.

### 2.2 Backend hardening (`backend/server.js`)
- `helmet` (com `crossOriginResourcePolicy: cross-origin` para liberar imagens S3 no front).
- `express-rate-limit`: `/api/auth/login` → 10 req / 15 min; `/api` geral → 120 req / min.
- `express.json({ limit: '1mb' })`.
- `app.set('trust proxy', 1)` para o rate-limit funcionar atrás do nginx.
- Endpoint `GET /health` retornando `{ status: 'ok' }`.
- Novas deps em `backend/package.json`: `helmet`, `express-rate-limit`.

### 2.3 Documentação alinhada ao código real
- `docs/api-contract.md`: removida rota fantasma `POST /admin/alunos/:id/fotos`. Adicionadas 8 rotas que existiam no código mas não no contrato: `PATCH /alunos/:id/liberar-fotos`, `GET/PUT/DELETE /alunos/:id/medidas/:medidaId`, `DELETE /protocolos/:id`, `GET /protocolos/:id/pdf`, `POST /treinos/:id/duplicar`, `GET /aluno/protocolos/:id/pdf`. Header agora documenta rate-limit + health.
- `docs/ui-contract.md`: **reescrito do zero**. Correção crítica: status do aluno agora é `em_dia | inadimplente | neutro | inativo` (era doc dizia 3 estados). Adicionada seção inteira de **Faturas** que faltava. Documentados uploads multipart, modos S3 vs YouTube em exercício, download de PDF, códigos `INATIVO/INADIMPLENTE`. Removida nota desatualizada sobre Dockerfiles trocados (verifiquei: estão corretos).

### 2.4 Frontend — `AlunoShell` com `<Outlet/>`
- `frontend/src/pages/aluno/AlunoLayout.jsx`: agora usa `<Outlet />` e deriva página ativa via `useLocation()`. Sem mais prop `paginaAtiva` e sem mais `children` direto.
- `frontend/src/App.jsx` `AlunoShell`: separadas rotas standalone (TreinoExecucao, RefeicaoDetalhe — sem nav inferior) das rotas com layout compartilhado (Home, Treino, Dieta, Perfil).
- Páginas `Home.jsx`, `Treino.jsx`, `Dieta.jsx`, `Perfil.jsx`: removido `import AlunoLayout`, removido o wrapper em todos os returns. **13 ocorrências** de `<AlunoLayout>` eliminadas.
- Build do frontend passa (`vite build` em ~4s).

### 2.5 Backend controllers — split por domínio
- `controllers/adminController.js` (1298l) **deletado**.
- Criados 13 arquivos em `controllers/admin/`:
  - `dashboard.js`, `alunos.js`, `medidas.js`, `fotos.js`, `pagamentos.js`, `faturas.js`, `exercicios.js`, `alimentos.js`, `cardio.js`, `protocolos.js`, `refeicoes.js`, `treinos.js`, `suplementacao.js`
- `routes/admin.js` reescrito importando direto de cada arquivo de domínio. **78 rotas registradas** — exatamente as mesmas do código original.

### 2.6 Backend models — split por domínio (a parte mais sensível)
- `models/aluno.js` (1325l) **deletado**.
- Helpers compartilhados isolados em `models/_shared.js`: `decorarExercicio`, `calcMacros`, `STATUS_SQL`, `toIsoDate`, `agruparFotosPorData`, `calcValorFinal`, `recalcFaturaStatus`.
- 14 arquivos de domínio criados em `models/`:
  - `alunos.js`, `medidas.js`, `fotos.js`, `pagamentos.js`, `faturas.js`, `exercicios.js`, `alimentos.js`, `cardio.js`, `protocolos.js`, `refeicoes.js`, `refeicao_itens.js`, `substitutos.js`, `treinos.js`, `treino_exercicios.js`, `suplementacao.js`.
- `models/index.js` é o **barrel** — todos os controllers fazem `require('../../models')`. Futuras refatorações são transparentes.
- Padrão **"uma tabela = um arquivo"** documentado em `docs/CODE-RULES.md` com a regra:
  > Quando uma operação cruza tabelas (leitura agregada, duplicação em cascata, transação multi-tabela), ela vive no domínio cujo ponto de entrada ela tem — não num arquivo misto.

### 2.7 Verificação
```bash
# Sintaxe de todos os models, controllers, routes, middlewares
for f in src/models/*.js src/controllers/admin/*.js src/controllers/*.js \
         src/routes/*.js src/middlewares/*.js src/services/*.js \
         src/config/*.js server.js; do
  node --check "$f" || echo "FAIL: $f"
done

# Barrel + router boot
AWS_S3_BUCKET=test JWT_SECRET=x JWT_REFRESH_SECRET=y \
DATABASE_URL=postgres://x:x@localhost:5432/x REDIS_URL=redis://localhost:6379 \
node -e "
  const m = require('./src/models');
  const fns = Object.keys(m); console.log('models:', fns.length);
  const router = require('./src/routes/admin');
  console.log('rotas admin:', router.stack.filter(l => l.route).length);
"
# Esperado: 76 funções no barrel, 78 rotas
```

---

## 3. Estado atual do branch

- **Nada commitado.** Mudanças acumuladas das quatro sessões: deleções de `node_modules`, `server.js` modificado (helmet/rate-limit/health + `require('./src/config/env')`), `backend/package.json`/`package-lock.json` com novas deps (`helmet`, `express-rate-limit`, `envalid`, `zod`, `eslint`, `eslint-config-prettier`, `prettier`), `frontend/package.json`/`package-lock.json` com novas devDeps (`eslint`, `eslint-config-prettier`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `prettier`), `controllers/adminController.js` deletado + 13 novos em `controllers/admin/`, `routes/admin.js` e `routes/auth.js` reescritos com `validate(schema)`, `models/aluno.js` deletado + 15 novos em `models/`, `src/config/env.js` criado, `src/config/migrate.js` e `src/config/seed.js` com `pg_advisory_lock`, `src/middlewares/validate.js` criado, `src/schemas/` criado com 14 arquivos (`_common.js` + 13 dom.), controllers limpos das validações manuais, `controllers/authController.js` ajustado (validação + import órfão removido), `docker-compose.yml` com `healthcheck`, `docs/api-contract.md` + `docs/ui-contract.md` + `docs/CODE-RULES.md` editados, `App.jsx` + `AlunoLayout.jsx` + 4 páginas do aluno editadas, `frontend/src/main.jsx` envolvido com `<ErrorBoundary>`, `frontend/src/components/ErrorBoundary.jsx` criado, `.eslintrc.cjs` + `.prettierrc` + `.prettierignore` criados em `frontend/` e `backend/`, `ProtocoloBuilder.jsx` com 3 `eslint-disable` órfãos removidos via `lint:fix`, `CLAUDE.md` atualizado, `prompts/HANDOFF.md` (este arquivo) criado/atualizado.
- **Nada deployado.** A imagem Docker em produção ainda é a anterior.
- Branch atual: `main`.

**Sugestão de commits temáticos antes de continuar:**
1. `chore: untrack node_modules`
2. `chore(backend): add helmet, rate-limit, body limit and /health endpoint`
3. `refactor(backend): split adminController into per-domain files under controllers/admin/`
4. `refactor(backend): split models/aluno.js into per-domain files with barrel index`
5. `refactor(frontend): use Outlet pattern for AlunoShell and remove inline AlunoLayout wrappers`
6. `docs: realign api-contract and ui-contract with code; document model split pattern`
7. `fix(backend): serialize migrate/seed across replicas with pg_advisory_lock`
8. `chore(infra): add healthcheck to backend service in docker-compose`
9. `feat(backend): validate required env vars at boot with envalid`
10. `feat(backend): validate request bodies with zod schemas via shared middleware`
11. `feat(frontend): wrap root with ErrorBoundary`
12. `chore: add ESLint + Prettier config to frontend and backend`

---

## 4. O que ainda falta (priorizado)

### 4.1 ALTA — antes de deploy
| # | Item | Onde | Impacto |
|---|------|------|---------|
| ~~A1~~ | ~~`migrate()` race condition no Swarm~~ | ✅ Concluído em 2026-05-20 (ver seção 2.A1). | — |
| ~~A2~~ | ~~Healthcheck no `docker-compose.yml`~~ | ✅ Concluído em 2026-05-20 (ver seção 2.A2). | — |
| ~~A3~~ | ~~Validação de env vars no boot~~ | ✅ Concluído em 2026-05-20 (ver seção 2.A3). | — |
| ~~A4~~ | ~~Validação de input com `zod` no backend~~ | ✅ Concluído em 2026-05-20 (ver seção 2.B). | — |

### 4.2 MÉDIA — qualidade pré-produção
| # | Item | Onde | Impacto |
|---|------|------|---------|
| B1 | Páginas frontend gigantes | `frontend/src/pages/admin/AlunoDetalhe.jsx` (2046l) e `ProtocoloBuilder.jsx` (2030l). Quebrar em subcomponentes em `frontend/src/components/aluno-detalhe/` e `frontend/src/components/protocolo-builder/` | Manutenção difícil, conflitos em PR, bundle alto |
| ~~B2~~ | ~~`ErrorBoundary` no React~~ | ✅ Concluído em 2026-05-20 (ver seção 2.C1). | — |
| ~~B3~~ | ~~ESLint + Prettier~~ | ✅ Concluído em 2026-05-20 (ver seções 2.C2 e 2.C3). | — |
| B4 | Code-splitting do frontend | Bundle atual: 849KB. Usar `React.lazy()` nas rotas admin (Dashboard, Alunos, AlunoDetalhe, ProtocoloBuilder) | Carregamento lento em mobile |
| B5 | Cache de inadimplência no Redis | `backend/src/middlewares/auth.js:30` faz um SELECT a cada request de aluno. Adicionar cache curto (60s) com chave `aluno_status:{aluno_id}`. Invalidar em `ativarAluno`/`desativarAluno`/`darBaixaFatura`/`createFatura`/`updateFatura`/`deleteFatura` | Gargalo em pico |
| B6 | Pool tuning no `pg` | `backend/src/config/db.js` cria pool sem `max`/`idleTimeoutMillis`. Configurar `max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000` | Conexões podem estourar em pico |

### 4.3 BAIXA — features de qualidade
| # | Item | Onde | Impacto |
|---|------|------|---------|
| C1 | Testes | Não há `jest`/`vitest`. Começar pelos models (mais críticos e puros) e auth | Sem rede de segurança em refatorações |
| C2 | Logger estruturado | Hoje só `console.error`. Adicionar `pino` com request-id correlato. Substituir os 103+ `console.error` por `logger.error` | Logs grep-eáveis em prod |
| C3 | Separar `users.js` de `alunos.js` | `models/alunos.js` (185l) tem operações em `users` (senha, ativar/desativar). Se a app crescer, separar | Hoje funcionalmente OK |
| C4 | `version: "3.9"` obsoleto | `docker-compose.yml` linha 1 — campo `version` é ignorado pelo Compose V2 | Cosmético |
| C5 | TypeScript progressivo | Não bloqueante. Considerar `.ts` em arquivos novos com config permissiva | Tipagem útil em projeto desse porte |

---

## 5. Plano de execução recomendado

Sugestão de ordem e tamanho de cada bloco. Cada bloco é um PR/commit independente.

**Bloco 1 — Production safety** ✅ **CONCLUÍDO em 2026-05-20** (ver seção 2).

**Bloco 2 — Frontend confiável** ✅ **CONCLUÍDO em 2026-05-20** (ver seção 2).

**Bloco 3 — Validação backend (zod)** ✅ **CONCLUÍDO em 2026-05-20** (ver seção 2).

**Bloco 4 — Refatoração de páginas gigantes**
Item B1. Tempo: 2–3 sessões. Começar por `AlunoDetalhe.jsx` (tem tabs claramente separáveis) → extrair cada tab em arquivo próprio. Depois `ProtocoloBuilder.jsx`.

**Bloco 5 — Performance**
Itens: B4 (code-splitting), B5 (cache Redis), B6 (pool tuning). Tempo: 1 sessão.

**Bloco 6 — Observabilidade & qualidade**
Itens: C1 (testes mínimos para models), C2 (logger).

---

## 6. Primeiros passos do próximo chat

Comandos para o próximo Claude confirmar o estado e começar:

```bash
# 1) Confirmar que o trabalho das sessões anteriores está aplicado
git status --short
ls backend/src/models/        # deve listar 16 arquivos (.js)
ls backend/src/controllers/admin/  # deve listar 13 arquivos
grep -l "require.*models/aluno" backend/src/  # deve dar VAZIO
ls backend/src/config/env.js  # deve existir (Bloco 1)

# 2) envalid falha cedo se faltar env var crítico (esperado: lista 8 vars + exit 1)
cd backend && env -i PATH="$PATH" node -e "require('./src/config/env')"

# 3) Smoke test do backend (esperado: 76 models, 78 rotas, 13 schemas, BOOT_LOCK_KEY=4242424242)
AWS_S3_BUCKET=test AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=y AWS_REGION=us-east-1 \
JWT_SECRET=x JWT_REFRESH_SECRET=y \
DATABASE_URL=postgres://x:x@localhost:5432/x REDIS_URL=redis://localhost:6379 \
node -e "
  const m = require('./src/models');
  console.log('models:', Object.keys(m).length);
  const r = require('./src/routes/admin');
  console.log('rotas admin:', r.stack.filter(l => l.route).length);
  const a = require('./src/routes/auth');
  console.log('rotas auth:', a.stack.filter(l => l.route).length);
  console.log('BOOT_LOCK_KEY:', require('./src/config/migrate').BOOT_LOCK_KEY);
  ['alunos','medidas','fotos','pagamentos','faturas','exercicios','alimentos','cardio','protocolos','refeicoes','treinos','suplementacao','auth']
    .forEach(s => console.log('schema', s, Object.keys(require('./src/schemas/' + s)).length, 'exports'));
"

# 4) Build do frontend
cd ../frontend && npm run build
```

Depois disso, escolha um bloco da seção 5. **Blocos 1, 2 e 3 concluídos.** Próximos sugeridos: Bloco 4 (B1 páginas frontend gigantes — `AlunoDetalhe.jsx` e `ProtocoloBuilder.jsx`) ou Bloco 5 (B4 code-splitting + B5 cache Redis + B6 pool tuning).

---

## 7. Regras invioláveis (já no `CLAUDE.md` + `docs/CODE-RULES.md`)

- Controllers importam `require('../../models')` (barrel). **Nunca** importam arquivo de domínio direto.
- Helpers cross-domínio (puros, sem I/O) **só** em `models/_shared.js`. Não duplicar.
- Uma tabela = um arquivo de model. Operações cross-tabela vivem no domínio "pai".
- Validação, status HTTP e mensagens vivem no **controller**. Model é puro SQL + regra de negócio do dado.
- Nada de inventar rotas/campos — sempre conferir `docs/api-contract.md` e `docs/ui-contract.md` antes.
- Access token nunca em `localStorage`. Sempre em React Context.
- Queries SQL sempre com parâmetros posicionais `$1, $2`. Nunca interpolação.
- `helmet`, `express-rate-limit`, `/health` já estão em `server.js`. Não remover.
- `envalid` valida env vars no boot (`src/config/env.js`). Adicione novas vars críticas lá.
- `migrate()` e `seed()` usam `pg_advisory_lock(BOOT_LOCK_KEY)` para serializar entre réplicas. Não remover.
- `<ErrorBoundary>` envolve o root em `frontend/src/main.jsx`. Toda nova feature de página herda a captura automaticamente.
- `npm run lint` deve passar (0 errors) antes de commitar — em backend exige 0 warnings também; em frontend há baseline de warnings tolerados.

---

## 8. Arquivos-chave para inspeção rápida

| Para entender... | Olhar |
|---|---|
| Estado atual da arquitetura | `docs/CODE-RULES.md` (seção "Estrutura de pastas") |
| Padrão de model | `backend/src/models/index.js` (comentário no topo) e `backend/src/models/_shared.js` |
| Contrato de API real | `docs/api-contract.md` |
| Shapes do frontend | `docs/ui-contract.md` |
| Schema do banco | `docs/schema.sql` |
| Hardening de prod | `backend/server.js` |
| Auth flow | `backend/src/middlewares/auth.js` + `backend/src/controllers/authController.js` + `frontend/src/services/api.js` + `frontend/src/context/AuthContext.jsx` |
| Layout do aluno | `frontend/src/pages/aluno/AlunoLayout.jsx` (`<Outlet/>` + nav inferior) e `frontend/src/App.jsx` (`AlunoShell`) |
| ErrorBoundary do root | `frontend/src/components/ErrorBoundary.jsx` + `frontend/src/main.jsx` |
| Config de lint/format | `{frontend,backend}/.eslintrc.cjs` + `{frontend,backend}/.prettierrc` |

---

**Última coisa:** se o próximo chat precisar continuar um bloco específico, atualize este arquivo na seção 4 marcando o item como concluído e mova para a seção 2 (histórico).

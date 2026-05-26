# Estado atual — Coach System

_Última atualização: 2026-05-26._

## Hardening pré-deploy: CONCLUÍDO

Todas as sessões de preparação para produção estão commitadas e no `main`.

---

## O que foi feito (resumo por bloco)

### Bloco 1 — Fundação de produção (sessões anteriores)

| Item | Status |
|------|--------|
| `pg_advisory_lock` no boot (evita race conditions em multi-réplica) | ✅ |
| Healthcheck no backend (`/health`) | ✅ |
| `envalid` — validação de env vars no boot | ✅ |
| `ErrorBoundary` no frontend | ✅ |
| ESLint + Prettier (frontend + backend) | ✅ |
| Validação Zod em 30+ rotas | ✅ |
| `React.lazy()` nas rotas admin | ✅ |
| Cache Redis para status de inadimplência (TTL 60s) | ✅ |
| Logger pino + request-id (105 `console.*` migrados) | ✅ |

### Bloco 2 — Hardening de segurança

| Item | Status |
|------|--------|
| Refresh token rotation (invalida token usado, emite novo) | ✅ |
| Rate limit no `/auth/refresh` (30 req/15min) | ✅ |
| Logout invalida access + refresh token no Redis | ✅ |
| Credenciais admin via `ADMIN_EMAIL`/`ADMIN_PASSWORD` (sem hardcode) | ✅ |
| `validateUUIDParams` em todas as rotas com parâmetros UUID | ✅ |
| Sentry com `beforeSend` filtrando cookies e Authorization | ✅ |
| Content Security Policy: nginx (frontend) + helmet (API) | ✅ |
| Audit trail: tabela `audit_log` (M017) + `logAudit()` | ✅ |

### Bloco 3 — Infraestrutura e operação

| Item | Status |
|------|--------|
| Paginação real com COUNT paralelo (alimentos, exercícios) | ✅ |
| `FRONTEND_URL` no docker-compose (CORS correto em prod) | ✅ |
| Backup automatizado (`docker/backup.sh` + cron docs) | ✅ |
| `backend/.dockerignore` (sem node_modules / .env no contexto) | ✅ |
| Graceful shutdown (SIGTERM fecha HTTP → pool PG → Redis) | ✅ |
| Healthcheck no frontend (wget no nginx) | ✅ |
| Gzip + cache imutável de 1 ano para assets Vite | ✅ |
| `deploy.sh` com build + push opcional + status pós-deploy | ✅ |

### Bloco 4 — Testes

| Item | Status |
|------|--------|
| 80 testes vitest passando | ✅ |
| `faturas.test.cjs` — 9 testes | ✅ |
| `alimentos.test.cjs` — 8 testes | ✅ |
| `exercicios.test.cjs` — 8 testes | ✅ |

### Bloco 5 — Estabilização documental pós-migração (2026-05-26)

| Item | Status |
|------|--------|
| Auditoria pós-migração da documentação (score 8.0/10) | ✅ |
| `prompts/archive/README.md` — 3 ponteiros mortos substituídos por `docs/README.md` | ✅ |
| Drift de migrações alinhado: `CLAUDE.md` + `DATABASE.md` agora refletem M001-M017 | ✅ |
| `docs/schema.sql` eleito fonte canônica de migrações | ✅ |
| `refactorareaaluno.patch` (órfão na raiz) removido — conteúdo já no git history | ✅ |
| `alimentos-biblioteca-base.txt` movido para `scripts/seeds/` | ✅ |

### Bloco 6 — Estabilização 2: resolução das ressalvas (2026-05-26)

| Item | Status |
|------|--------|
| Script legado *scripts/deploy.sh* removido (apontava para docker-compose.prod.yml inexistente) | ✅ |
| Script legado *scripts/backup-db.sh* (rclone B2) removido — `docker/backup.sh` é o canônico | ✅ |
| Permissões obsoletas em `.claude/settings.local.json` limpas | ✅ |
| Rodapé de `docs/schema.sql` declara escopo parcial e remete a `DATABASE.md` + `migrate.js` | ✅ |
| Regra de manutenção de migração M0XX adicionada em `docs/README.md` | ✅ |
| `scripts/check-doc-links.sh` — validador de paths citados em docs | ✅ |
| Validação executada: zero links quebrados | ✅ |

**Pendência operacional:** se houver cron em produção apontando para o antigo *scripts/backup-db.sh*, removê-lo no manager (não impacta repo).

---

## Estado de deploy

**Não deployado ainda.** Código está no `main`, pronto para o primeiro deploy.

### Checklist pré-deploy

- [ ] Preencher `.env.prod` a partir de `.env.prod.example`
- [ ] `docker swarm init` no manager (se ainda não feito)
- [ ] `bash deploy.sh` na raiz do projeto
- [ ] Configurar cron do backup (`docs/ops/docker.md` → seção Backup)
- [ ] Apontar domínio para o IP do manager
- [ ] Configurar TLS/HTTPS (Caddy, Traefik, ou Certbot+nginx externo)

---

## Pendentes (não bloqueiam o deploy)

| # | Item | Prioridade |
|---|------|-----------|
| 1 | HTTPS/TLS — SSL termination (Certbot + nginx reverse proxy, Caddy, ou Traefik) | Alta |
| 2 | Validação de integridade do backup (`gzip -t` após geração) | Média |
| 3 | Testes E2E (Playwright) — fluxo de login, protocolo, fatura | Baixa |
| 4 | `nginx-spa.conf` removido (arquivo órfão já deletado) | ✅ feito |

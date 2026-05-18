# Stack

| Camada | Tecnologia | Notas |
|--------|-----------|-------|
| Front-end | React + React Router + Tailwind CSS | Componentes próprios em `src/components/ui/` — sem shadcn/ui |
| Back-end | Node.js + Express | async/await, try/catch obrigatório |
| Banco de dados | PostgreSQL 16 | Pool via `config/db.js` |
| Cache / Sessões | Redis 7 | ioredis, flags via `config/redis.js` |
| Autenticação | JWT | Access token em Context, refresh em cookie httpOnly |
| Geração de PDF | Puppeteer | Chromium no Alpine Docker |
| Envio de email | Resend (@resend/node) | Via `services/email.js` |
| Containerização | Docker (multi-stage) | `frontend.Dockerfile` + `backend.Dockerfile` |
| Orquestração | Docker Swarm | Manager + Workers, rede overlay `coach_network` |

## Infraestrutura — Docker Swarm

**Placement:**
- `database` (postgres:16-alpine) + `cache` (redis:7-alpine) → **fixos no manager**
- `backend` + `frontend` → **replicáveis nos workers**

**Rede:** Todos via overlay `coach_network`. Nenhuma porta de DB/cache exposta ao host.

**Backend vars** (via `process.env`):
```
DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET,
PORT, NODE_ENV, RESEND_API_KEY, EMAIL_FROM
```

**Puppeteer no Alpine:**
```dockerfile
RUN apk add --no-cache chromium nss freetype harfburst ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

## Estrutura de arquivos

```
coach-system/
├── docker/
│   ├── frontend.Dockerfile    (multi-stage: node build + nginx)
│   ├── backend.Dockerfile     (multi-stage: npm install + Alpine + Chromium)
│   └── nginx.conf             (proxy /api/* + try_files SPA)
├── docker-compose.yml         (stack Swarm completa)
├── backend/src/
│   ├── config/ (db.js, redis.js, migrate.js, seed.js)
│   ├── middlewares/ (auth.js, authorize.js)
│   ├── routes/, controllers/, models/, services/
│   └── templates/protocolo.html
├── frontend/src/
│   ├── context/, services/, components/, pages/
│   ├── components/ui/ (Button, Card, Input, Modal, Toast)
│   └── tailwind.config.js
└── docs/ (schema.sql, api-contract.md, ui-contract.md)
```

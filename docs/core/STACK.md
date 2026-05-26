# Stack e Infraestrutura

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Front-end | React + React Router + Tailwind CSS + componentes próprios em src/components/ui/ |
| Back-end | Node.js + Express |
| Banco | PostgreSQL (pg.Pool via DATABASE_URL) |
| Cache / Sessões | Redis (ioredis via REDIS_URL) |
| Autenticação | JWT — access token em memória, refresh token em cookie httpOnly |
| PDF | Puppeteer (Chromium no Alpine) |
| Email | Resend (@resend/node) |
| Upload | AWS S3 + multer-s3 |
| Container | Docker multi-stage |
| Orquestração | Docker Swarm |

---

## Docker Swarm

### Placement
- `database` (postgres:16-alpine) e `cache` (redis:7-alpine) → imagens públicas, fixas no manager
- `backend` e `frontend` → imagens customizadas, replicáveis nos workers (sem placement em ambiente de 1 nó só)

### Rede interna
Todos na overlay `coach_network`. Comunicação pelo nome do serviço:
- Backend → banco: `postgres://user:pass@database:5432/db`
- Backend → Redis: `redis://:pass@cache:6379`

### Variáveis de ambiente do backend (todas no docker-compose.yml em environment)
```
DATABASE_URL, REDIS_URL
JWT_SECRET, JWT_REFRESH_SECRET
PORT, NODE_ENV
RESEND_API_KEY, EMAIL_FROM
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET, S3_PUBLIC_URL
PUPPETEER_EXECUTABLE_PATH, PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
```

### Puppeteer no Docker Alpine
```dockerfile
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### nginx.conf
- `/api/*` → proxy_pass para `http://backend:3000/api/`
- `/*` → try_files para SPA (React Router)
- `proxy_pass_header Set-Cookie` → necessário para cookie httpOnly do refresh token

### Deploy
```bash
set -a && source .env && set +a
docker stack deploy -c docker-compose.yml coach

# Rebuild e atualização sem downtime
docker build --no-cache -f docker/backend.Dockerfile -t coach-backend:latest .
docker build --no-cache -f docker/frontend.Dockerfile -t coach-frontend:latest .
docker service update --force --image coach-backend:latest coach_backend
docker service update --force --image coach-frontend:latest coach_frontend
```

---

## AWS S3

- Bucket: `coach-system-uploads`
- Região: `us-east-1`
- Pasta por tipo: `alunos/fotos/`, `exercicios/videos/`, `exercicios/thumbs/`, `alimentos/fotos/`
- Leitura pública via bucket policy
- Limites: imagens 15MB, vídeos 500MB
- Tipos aceitos: imagens (jpeg/png/webp), vídeos (mp4/webm/quicktime)
- Ao deletar arquivo: sempre chamar `deletarArquivo(s3_key)` do services/storage.js

---

## Vídeos de exercício

Dois modos suportados:
- `tipo = 'youtube'` → campo `video_youtube_url` + `video_embed_url` calculado na query
- `tipo = 's3'` → campo `video_url` (URL S3) + `video_s3_key`
- **Sem thumbnail** — o vídeo é exibido diretamente

---

## Email (Resend)

- Remetente: `EMAIL_FROM` (usar `onboarding@resend.dev` em dev sem domínio verificado)
- Limitação do plano gratuito sem domínio: só envia para o próprio email da conta Resend
- Para produção real: verificar domínio em resend.com → usar `noreply@seudominio.com`

---

## Design system

Ver [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md).

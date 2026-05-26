# Docker — Coach System

## Estrutura de arquivos

```
coach-system/
├── docker/
│   ├── frontend.Dockerfile      ← build da imagem React
│   └── backend.Dockerfile       ← build da imagem Node.js
├── docker-compose.yml           ← stack do Swarm (todos os serviços)
└── .env                         ← variáveis de ambiente (nunca commitar)
```

---

## docker/frontend.Dockerfile

```dockerfile
# Estágio 1 — build
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# Estágio 2 — serve com nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Config nginx para SPA (React Router)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## docker/backend.Dockerfile

```dockerfile
# Estágio 1 — build / install deps
FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .

# Estágio 2 — imagem final enxuta
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
```

---

## docker-compose.yml

```yaml
version: "3.9"

services:

  # ─────────────────────────────────────────
  # BANCO DE DADOS — imagem pública, manager only
  # ─────────────────────────────────────────
  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - coach_network
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager        # fixo no manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: "1"
          memory: 512M

  # ─────────────────────────────────────────
  # CACHE — imagem pública, manager only
  # ─────────────────────────────────────────
  cache:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - coach_network
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager        # fixo no manager
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: "0.5"
          memory: 256M

  # ─────────────────────────────────────────
  # BACK-END — replicável, workers
  # ─────────────────────────────────────────
  backend:
    image: coach-backend:latest       # build com docker/backend.Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@cache:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    networks:
      - coach_network
    depends_on:
      - database
      - cache
    deploy:
      replicas: 2                     # escala horizontal
      placement:
        constraints:
          - node.role == worker       # roda nos workers
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first            # zero downtime deploy
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: "0.5"
          memory: 256M

  # ─────────────────────────────────────────
  # FRONT-END — replicável, workers
  # ─────────────────────────────────────────
  frontend:
    image: coach-frontend:latest      # build com docker/frontend.Dockerfile
    networks:
      - coach_network
    deploy:
      replicas: 2                     # escala horizontal
      placement:
        constraints:
          - node.role == worker       # roda nos workers
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first            # zero downtime deploy
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: "0.25"
          memory: 128M

# ─────────────────────────────────────────
# VOLUMES persistentes
# ─────────────────────────────────────────
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

# ─────────────────────────────────────────
# REDE interna do Swarm (overlay)
# ─────────────────────────────────────────
networks:
  coach_network:
    driver: overlay
    attachable: true
```

---

## .env.example

```bash
# Copiar para .env e preencher os valores reais
# NUNCA commitar o .env

# Postgres
POSTGRES_DB=coach_db
POSTGRES_USER=coach_user
POSTGRES_PASSWORD=troque_essa_senha_forte

# Redis
REDIS_PASSWORD=troque_essa_senha_forte

# JWT
JWT_SECRET=gere_com_openssl_rand_base64_64
JWT_REFRESH_SECRET=gere_com_openssl_rand_base64_64
```

---

## Comandos de operação

### Build das imagens customizadas

```bash
# Na raiz do projeto

# Build do back-end
docker build -f docker/backend.Dockerfile -t coach-backend:latest .

# Build do front-end
docker build -f docker/frontend.Dockerfile -t coach-frontend:latest .
```

### Inicializar o Swarm (apenas uma vez no manager)

```bash
# No servidor manager
docker swarm init --advertise-addr <IP_DO_MANAGER>

# O comando retorna um token — use para adicionar workers:
docker swarm join --token <TOKEN> <IP_DO_MANAGER>:2377
```

### Deploy da stack

```bash
# No manager
docker stack deploy -c docker-compose.yml coach
```

### Escalar serviços manualmente

```bash
# Aumentar réplicas do back-end
docker service scale coach_backend=4

# Aumentar réplicas do front-end
docker service scale coach_frontend=4
```

### Atualizar uma imagem (zero downtime)

```bash
# Rebuild da imagem
docker build -f docker/backend.Dockerfile -t coach-backend:latest .

# Forçar update do serviço (usa start-first — nova réplica sobe antes da antiga cair)
docker service update --image coach-backend:latest coach_backend
```

### Monitorar a stack

```bash
# Ver todos os serviços
docker stack services coach

# Ver containers rodando (em qual nó)
docker stack ps coach

# Logs de um serviço
docker service logs -f coach_backend
docker service logs -f coach_frontend
```

### Remover a stack

```bash
docker stack rm coach
```

---

## Arquitetura do Swarm

```
                    ┌─────────────────────────┐
                    │     MANAGER NODE         │
                    │                          │
                    │  ┌─────────┐  ┌───────┐ │
                    │  │ Postgres│  │ Redis │ │
                    │  │  :5432  │  │ :6379 │ │
                    │  └─────────┘  └───────┘ │
                    └──────────┬──────────────┘
                               │ overlay network (coach_network)
              ┌────────────────┴────────────────┐
              │                                 │
   ┌──────────┴──────────┐          ┌──────────┴──────────┐
   │     WORKER NODE 1    │          │     WORKER NODE 2    │
   │                      │          │                      │
   │  ┌────────┐          │          │  ┌────────┐         │
   │  │backend │          │          │  │backend │         │
   │  │  :3000 │          │          │  │  :3000 │         │
   │  └────────┘          │          │  └────────┘         │
   │  ┌──────────┐        │          │  ┌──────────┐       │
   │  │ frontend │        │          │  │ frontend │       │
   │  │   :80   │        │          │  │   :80   │       │
   │  └──────────┘        │          │  └──────────┘       │
   └─────────────────────┘          └─────────────────────┘
```

Postgres e Redis ficam fixos no manager via `placement constraints`.
Backend e frontend rodam nos workers e escalam horizontalmente.
Toda comunicação interna usa a rede overlay `coach_network` — os containers se
encontram pelo nome do serviço (ex: `database`, `cache`) sem expor portas ao host.

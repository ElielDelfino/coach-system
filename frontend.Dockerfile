# Estágio 1 — build
FROM node:22-alpine AS builder

WORKDIR /app

# ─── EASYPANEL — descomente para passar a URL do backend como build arg ───────
# ARG VITE_API_URL=/api
# ENV VITE_API_URL=$VITE_API_URL
# Build: docker build --build-arg VITE_API_URL=https://meubackend.easypanel.host/api ...
# ─────────────────────────────────────────────────────────────────────────────
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# Estágio 2 — serve com nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# ─── LOCAL: usa nginx.conf com proxy /api/ → backend:3000 ────────────────────
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# ─── EASYPANEL: troque a linha acima por esta (nginx só SPA, sem proxy) ───────
# COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
# ─────────────────────────────────────────────────────────────────────────────

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

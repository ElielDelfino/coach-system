# Estágio 1 — build
FROM node:22-alpine AS builder

WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# Estágio 2 — serve com nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Config nginx: proxy /api/ → backend e SPA fallback para React Router
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

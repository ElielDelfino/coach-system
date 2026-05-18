# Estágio 1 — build / install deps
FROM node:20-alpine AS builder

WORKDIR /app

# Não baixar o Chromium do Puppeteer no builder — usaremos o do Alpine no estágio final
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .
COPY docs/ ./docs/

# Estágio 2 — imagem final enxuta com Chromium do Alpine para o Puppeteer
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]

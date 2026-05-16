# Estágio 1 — build / install deps
FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .
COPY docs/ ./docs/ 

# Estágio 2 — imagem final enxuta
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]

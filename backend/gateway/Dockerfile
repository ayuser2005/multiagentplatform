# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Nexora AI - API Gateway
# ---------------------------------------------------------------------------
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Root workspace dependencies (shared/redis uses ioredis)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Service dependencies
COPY ./gateway/package*.json ./gateway/
RUN cd gateway && npm ci --omit=dev --no-audit --no-fund

COPY gateway ./gateway
COPY shared ./shared

WORKDIR /app/gateway

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8000/health || exit 1

CMD ["node", "index.js"]

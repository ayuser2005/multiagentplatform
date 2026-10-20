# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Nexora AI - Chat Service (conversations & messages)
# ---------------------------------------------------------------------------
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Root workspace dependencies (shared/redis uses ioredis)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Service dependencies
COPY ./services/chat/package*.json ./services/chat/
RUN cd services/chat && npm ci --omit=dev --no-audit --no-fund

COPY services/chat ./services/chat
COPY shared ./shared

WORKDIR /app/services/chat

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8002/health || exit 1

CMD ["node", "index.js"]

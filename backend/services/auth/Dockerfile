# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Nexora AI - Auth Service (Firebase authentication, sessions, credits)
# ---------------------------------------------------------------------------
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Root workspace dependencies (shared/redis uses ioredis)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Service dependencies
COPY ./services/auth/package*.json ./services/auth/
RUN cd services/auth && npm ci --omit=dev --no-audit --no-fund

COPY services/auth ./services/auth
COPY shared ./shared

WORKDIR /app/services/auth

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8001/health || exit 1

CMD ["node", "index.js"]

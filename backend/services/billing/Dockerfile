# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Nexora AI - Billing Service (Razorpay orders & plan activation)
# ---------------------------------------------------------------------------
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

# Root workspace dependencies (shared/redis uses ioredis)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Service dependencies
COPY ./services/billing/package*.json ./services/billing/
RUN cd services/billing && npm ci --omit=dev --no-audit --no-fund

COPY services/billing ./services/billing
COPY shared ./shared

WORKDIR /app/services/billing

EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8004/health || exit 1

CMD ["node", "index.js"]

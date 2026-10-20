# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Nexora AI - Agent Service (LangGraph multi-agent orchestration)
#
# All document/image generation is done in pure JavaScript
# (pdfkit / pptxgenjs / mammoth / pdf-parse / xlsx), so no LibreOffice,
# JDK or system font stack is required - keeping the image small.
# ---------------------------------------------------------------------------
FROM node:24-alpine

RUN apk add --no-cache \
        python3 \
        gcompat \
        curl \
        tini

WORKDIR /app

ENV NODE_ENV=production

# Root workspace dependencies (shared/redis uses ioredis)
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Service dependencies
COPY ./services/agent/package*.json ./services/agent/
RUN cd services/agent && npm ci --omit=dev --no-audit --no-fund

COPY services/agent ./services/agent
COPY shared ./shared

# The agent service writes generated artifacts to ./temp at runtime
RUN mkdir -p services/agent/temp && chown -R node:node /app

WORKDIR /app/services/agent

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8003/health || exit 1

USER node

# tini reaps zombie processes and forwards SIGTERM for graceful shutdown
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.js"]

# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Nexora AI - Frontend
#   Stage 1: build the Vite application
#   Stage 2: serve the static bundle with Nginx and proxy /api to the gateway
# ---------------------------------------------------------------------------

# ------------------------------- build stage ---------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Vite inlines VITE_* variables at build time, so they must be provided as
# build arguments and re-declared as environment variables.
ARG VITE_SERVER_URL=""
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_RAZORPAY_KEY_ID=""

ENV VITE_SERVER_URL=$VITE_SERVER_URL \
    VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build

# ----------------------------- production stage ------------------------------
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

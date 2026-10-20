#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Nexora AI - EC2 Deployment Script
#
#   ./deploy-to-ec2.sh <EC2_PUBLIC_IP_OR_DNS>
#
# Installs Docker, provisions swap, syncs the source tree and starts the stack.
# The remote .env is never overwritten.
# ==============================================================================

KEY_PATH="${KEY_PATH:-./deploy-key.pem}"
EC2_USER="${EC2_USER:-ubuntu}"
REMOTE_DIR="${REMOTE_DIR:-app}"          # relative to the remote user's home
COMPOSE_FILE="docker-compose.prod.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}==>${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; exit 1; }

# ------------------------------------------------------------------------------
# Argument validation
# ------------------------------------------------------------------------------
if [ -z "${1:-}" ]; then
    cat <<'EOF'
======================================================================
 Nexora AI - EC2 Deployment

Usage: ./deploy-to-ec2.sh <EC2_PUBLIC_IP_OR_DNS>

Environment variables:
  KEY_PATH    Path to the SSH private key   (default: ./deploy-key.pem)
  EC2_USER    SSH user                     (default: ubuntu)
  REMOTE_DIR  Remote project directory      (default: ~/app)
EOF
    exit 1
fi

EC2_HOST="$1"

if [ ! -f "$KEY_PATH" ]; then
    fail "Key file '$KEY_PATH' not found. Set KEY_PATH to your private key."
fi

if ! command -v ssh >/dev/null 2>&1; then
    fail "ssh is not installed."
fi

if ! command -v rsync >/dev/null 2>&1; then
    fail "rsync is not installed. Install it and re-run."
fi

chmod 400 "$KEY_PATH"

SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -i "$KEY_PATH")

# ------------------------------------------------------------------------------
# 1. Connectivity check
# ------------------------------------------------------------------------------
info "Testing SSH connectivity to ${EC2_USER}@${EC2_HOST}..."
ssh "${SSH_OPTS[@]}" "${EC2_USER}@${EC2_HOST}" "echo '--> Connected successfully!'"
ok "SSH connection verified"

# ------------------------------------------------------------------------------
# 2. Server preparation
# ------------------------------------------------------------------------------
info "Preparing the server (Docker, Compose plugin, swap space)..."

ssh "${SSH_OPTS[@]}" "${EC2_USER}@${EC2_HOST}" 'bash -s' << 'REMOTE_SETUP'
set -euo pipefail

# 4GB swap prevents OOM kills on small instances.
if [ "$(swapon --show | wc -l)" -le 1 ]; then
    echo "    Creating 4GB swap space..."
    sudo fallocate -l 4G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile >/dev/null
    sudo swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
    echo "    Swap ready."
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "    Installing Docker..."
    sudo apt-get update -y >/dev/null
    sudo apt-get install -y ca-certificates curl gnupg >/dev/null
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y >/dev/null
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
    sudo usermod -aG docker "$USER"
    echo "    Docker installed."
else
    echo "    Docker already present."
fi

if ! docker compose version >/dev/null 2>&1; then
    echo "    Installing the Docker Compose plugin..."
    sudo apt-get update -y >/dev/null
    sudo apt-get install -y docker-compose-plugin >/dev/null
fi

sudo systemctl enable --now docker >/dev/null 2>&1 || true
REMOTE_SETUP

ok "Server prepared"

# ------------------------------------------------------------------------------
# 3. Sync the source tree
# ------------------------------------------------------------------------------
info "Syncing the project to ${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}..."
ssh "${SSH_OPTS[@]}" "${EC2_USER}@${EC2_HOST}" "mkdir -p \"\$HOME/${REMOTE_DIR}\""

rsync -az --delete \
    --exclude='.env' \
    --exclude='.env.*' \
    --exclude='!.env.example' \
    --exclude='deploy-key.pem' \
    --exclude='*.pem' \
    --exclude='*.backup' \
    --exclude='*.bak' \
    --exclude='audit-report.json' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.DS_Store' \
    --exclude='serviceAccountKey.json' \
    -e "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR -i ${KEY_PATH}" \
    ./ "${EC2_USER}@${EC2_HOST}:${REMOTE_DIR}/"

ok "Source synced"

# ------------------------------------------------------------------------------
# 4. Validate the remote environment
# ------------------------------------------------------------------------------
info "Validating the remote environment..."

ssh "${SSH_OPTS[@]}" "${EC2_USER}@${EC2_HOST}" "REMOTE_DIR='${REMOTE_DIR}' COMPOSE_FILE='${COMPOSE_FILE}' bash -s" << 'REMOTE_CHECK'
set -euo pipefail
cd "$HOME/${REMOTE_DIR}"

if [ ! -f .env ]; then
    echo "ERROR: .env is missing on the server."
    echo "       Create it before deploying:  ssh -i deploy-key.pem ubuntu@<host> 'nano ~/app/.env'"
    exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "ERROR: ${COMPOSE_FILE} is missing on the server."
    exit 1
fi

required_keys="MONGODB_URI GROQ_API_KEY FIREBASE_SERVICE_ACCOUNT_PATH"
missing=""
for key in ${required_keys}; do
    if ! grep -qE "^${key}=.+" .env; then
        missing="${missing} ${key}"
    fi
done

if [ -n "${missing}" ]; then
    echo "WARNING: missing or empty values in .env:${missing}"
    echo "         The platform will still start, but the related features will be disabled."
fi

sudo docker compose -f "${COMPOSE_FILE}" config --quiet
REMOTE_CHECK

ok "Environment validated"

# ------------------------------------------------------------------------------
# 5. Build and start
# ------------------------------------------------------------------------------
info "Building images and starting the stack..."

ssh "${SSH_OPTS[@]}" "${EC2_USER}@${EC2_HOST}" "REMOTE_DIR='${REMOTE_DIR}' COMPOSE_FILE='${COMPOSE_FILE}' bash -se" << 'REMOTE_DEPLOY'
set -euo pipefail
cd "$HOME/${REMOTE_DIR}"

sudo docker compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans

echo "    Waiting for the API gateway to become healthy..."
for attempt in $(seq 1 24); do
    if sudo docker compose -f "${COMPOSE_FILE}" exec -T gateway node -e '
        const http = require("http");
        const req = http.get("http://127.0.0.1:8000/health", res => {
            res.resume();
            process.exit(res.statusCode === 200 ? 0 : 1);
        });
        req.setTimeout(3000, () => req.destroy(new Error("timeout")));
        req.on("error", () => process.exit(1));
    '; then
        echo "    Gateway is healthy."
        break
    fi

    if [ "$attempt" -eq 24 ]; then
        echo "    Gateway health check failed."
        sudo docker compose -f "${COMPOSE_FILE}" ps
        sudo docker compose -f "${COMPOSE_FILE}" logs --tail=100 gateway
        exit 1
    fi

    sleep 5
done

echo "    Verifying every service health endpoint..."
for entry in "auth:8001" "chat:8002" "agent:8003" "billing:8004"; do
    service="${entry%%:*}"
    port="${entry##*:}"
    if sudo docker compose -f "${COMPOSE_FILE}" exec -T "$service" node -e "
        const http = require('http');
        const req = http.get('http://127.0.0.1:${port}/health', res => {
            res.resume();
            process.exit(res.statusCode === 200 ? 0 : 1);
        });
        req.setTimeout(3000, () => req.destroy(new Error('timeout')));
        req.on('error', () => process.exit(1));
    "; then
        echo "      ${service} healthy"
    else
        echo "      ${service} NOT healthy - check: docker compose logs ${service}"
    fi
done

sudo docker compose -f "${COMPOSE_FILE}" ps
REMOTE_DEPLOY

ok "Deployment complete"

cat <<EOF

======================================================================
 Nexora AI is deployed.

  App      : http://${EC2_HOST}
  Status   : ssh -i ${KEY_PATH} ${EC2_USER}@${EC2_HOST} 'cd ${REMOTE_DIR} && sudo docker compose -f ${COMPOSE_FILE} ps'
  Logs     : ssh -i ${KEY_PATH} ${EC2_USER}@${EC2_HOST} 'cd ${REMOTE_DIR} && sudo docker compose -f ${COMPOSE_FILE} logs -f'
  Redeploy : ./deploy-to-ec2.sh ${EC2_HOST}
======================================================================
EOF

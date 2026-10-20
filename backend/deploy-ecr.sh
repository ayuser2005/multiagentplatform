#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Nexora AI - AWS ECR build & push script
#
# Builds every microservice image and pushes it to Amazon ECR, so the
# services can be run on ECS/Fargate or pulled onto an EC2 instance.
#
#   AWS_ACCOUNT_ID=123456789012 ./backend/deploy-ecr.sh
#
# The EC2 deployment path (./deploy-to-ec2.sh) does not need this script.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

AWS_REGION="${AWS_REGION:-ap-south-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "Error: AWS_ACCOUNT_ID is not set and could not be determined from the AWS CLI."
    echo "Usage: AWS_ACCOUNT_ID=123456789012 $0"
    exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
    echo "Error: the AWS CLI is required (https://aws.amazon.com/cli/)."
    exit 1
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "=========================================="
echo "Nexora AI - ECR publish"
echo "Region      : ${AWS_REGION}"
echo "Account     : ${AWS_ACCOUNT_ID}"
echo "Registry    : ${ECR_REGISTRY}"
echo "Image tag   : ${IMAGE_TAG}"
echo "=========================================="

echo "==> Authenticating Docker to ECR in ${AWS_REGION}..."
aws ecr get-login-password --region "${AWS_REGION}" \
    | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

# ---------------------------------------------------------------------------
# Backend services - build context is the backend/ directory
# ---------------------------------------------------------------------------
BACKEND_SERVICES=(
    "gateway:backend/gateway/Dockerfile"
    "auth:backend/services/auth/Dockerfile"
    "chat:backend/services/chat/Dockerfile"
    "agent:backend/services/agent/Dockerfile"
    "billing:backend/services/billing/Dockerfile"
)

# ---------------------------------------------------------------------------
# Frontend - build context is the frontend/ directory
# ---------------------------------------------------------------------------
FRONTEND_SERVICES=(
    "frontend:frontend/Dockerfile"
)

publish_image() {
    local service_name="$1"
    local dockerfile_path="$2"
    local context_dir="$3"

    local repo_name="nexora-${service_name}"
    local full_image_uri="${ECR_REGISTRY}/${repo_name}:${IMAGE_TAG}"

    echo "----------------------------------------------------"
    echo "Service         : ${service_name}"
    echo "Repository      : ${repo_name}"
    echo "Image           : ${full_image_uri}"
    echo "----------------------------------------------------"

    aws ecr describe-repositories --repository-names "${repo_name}" --region "${AWS_REGION}" >/dev/null 2>&1 \
        || aws ecr create-repository \
            --repository-name "${repo_name}" \
            --region "${AWS_REGION}" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256

    echo "--> Building ${service_name} (linux/amd64)..."
    docker build \
        --platform linux/amd64 \
        -f "${REPO_ROOT}/${dockerfile_path}" \
        -t "${repo_name}:${IMAGE_TAG}" \
        -t "${full_image_uri}" \
        "${REPO_ROOT}/${context_dir}"

    echo "--> Pushing ${full_image_uri}..."
    docker push "${full_image_uri}"

    echo "Successfully pushed ${full_image_uri}"
}

for entry in "${BACKEND_SERVICES[@]}"; do
    publish_image "${entry%%:*}" "${entry##*:}" "backend"
done

for entry in "${FRONTEND_SERVICES[@]}"; do
    publish_image "${entry%%:*}" "${entry##*:}" "frontend"
done

echo "===================================================="
echo "All images pushed to ${AWS_REGION}."
echo "Update docker-compose.prod.yml to reference:"
echo "  ${ECR_REGISTRY}/nexora-<service>:${IMAGE_TAG}"
echo "===================================================="

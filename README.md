# Nexora AI — Multi-Agent Enterprise Workspace

> A production-grade, microservices-based **multi-agent AI platform** that routes natural-language requests to specialised AI agents and returns real, downloadable deliverables — code workspaces, PDF reports, slide decks, and images.

[![CI](https://github.com/ayuser2005/multiagentplatform/actions/workflows/ci.yml/badge.svg)](https://github.com/ayuser2005/multiagentplatform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-5FA04E.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/react-19-61DAFB.svg)](https://react.dev)
[![Docker](https://img.shields.io/badge/docker-compose-2496ED.svg)](https://docs.docker.com/compose/)

---

## Table of Contents

- [Highlights](#highlights)
- [Architecture](#architecture)
- [The Agent System](#the-agent-system)
- [Tech Stack](#tech-stack)
- [Feature Tour](#feature-tour)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Security](#security)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [License](#license)

---

## Highlights

| | |
|---|---|
| **10-node LangGraph orchestrator** | A 14-stage intent cascade routes every prompt to one of 9 specialised agents, with multi-step handoffs (e.g. `RAG → PDF`, `Search → Slides`) |
| **Real deliverables, not chat text** | Generated multi-file code projects (with a live browser preview + ZIP), PDF reports, `.pptx` decks, and images — all downloadable |
| **Self-verifying code agent** | Generated code is executed in a hardened sandbox and tested against interactive DOM suites (calculator, todo, form validation) before being returned |
| **True microservices** | 5 independent Node.js services + Redis behind an API Gateway, each with its own Dockerfile, health endpoint and health-checked Compose wiring |
| **Production hardening** | Session-cookie auth, Redis-backed sessions, CORS allow-listing, service-to-service secrets, path-traversal guards, hardened VM sandbox, rate limiting and credit metering |
| **Full CI/CD** | GitHub Actions run unit tests, lint, build and boot every service, then deploy to AWS EC2 over SSH with post-deploy health verification |
| **Zero-config resilience** | Every service boots without any API keys configured and degrades gracefully — a missing provider key disables one agent instead of crashing the platform |

---

## Architecture

```
                          ┌──────────────────────────────┐
   Browser  ── HTTPS ───▶ │  Nginx  (frontend container) │
                          │  static SPA + /api proxy     │
                          └──────────────┬───────────────┘
                                         │
                          ┌──────────────▼───────────────┐
                          │      API Gateway  :8000      │
                          │  CORS · session guard ·       │
                          │  service proxying             │
                          └──┬────┬────┬────┬───────────┘
                             │    │    │    │
          ┌──────────────────┘    │    │    └──────────────────┐
          ▼                       ▼    ▼                       ▼
   ┌─────────────┐        ┌─────────────┐            ┌─────────────┐
   │ Auth  :8001 │        │ Chat  :8002 │            │Billing :8004│
   │ Firebase    │        │ MongoDB     │            │ Razorpay    │
   │ sessions    │        │ conversations│            │ orders      │
   │ credits     │        │ messages    │            │ verification│
   └──────┬──────┘        └─────────────┘            └──────┬──────┘
          │                                                  │
          └──────────────┐                    ┌──────────────┘
                         ▼                    ▼
                  ┌────────────────────────────────┐
                  │     Agent Service  :8003       │
                  │  LangGraph orchestrator        │
                  │  router → 9 specialist agents  │
                  │  tool execution · artifacts    │
                  └───────────┬────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        ▼                     ▼                      ▼
   ┌─────────┐         ┌───────────┐          ┌────────────┐
   │  Redis  │         │ MongoDB   │          │  AWS S3    │
   │sessions │         │  Atlas    │          │  artifacts │
   │limits   │         │           │          │            │
   └─────────┘         └───────────┘          └────────────┘

   External: Groq (LLM) · Gemini (embeddings/vision) · Tavily (web search)
              Qdrant (vector store) · Razorpay (payments) · Firebase (auth)
```

### Service responsibilities

| Service | Port | Responsibility |
|---|---|---|
| **Gateway** | 8000 | Single public entry point. CORS allow-listing, Redis session validation, request proxying, blocks internal-only routes. |
| **Auth** | 8001 | Firebase ID-token verification, Redis session issuance, user profile, plan & credit ledger. |
| **Chat** | 8002 | Conversation and message persistence in MongoDB, with ownership checks (IDOR guard). |
| **Agent** | 8003 | LangGraph orchestration, 9 specialist agents, tool execution, artifact generation (code/PDF/PPTX/images). |
| **Billing** | 8004 | Razorpay order creation, HMAC-SHA256 signature verification, idempotent plan activation. |
| **Redis** | 6379 | Sessions, per-agent rate limiting, short-term conversation memory. |
| **Frontend** | 80 | Vite/React SPA served by Nginx, reverse-proxying `/api` to the gateway. |

---

## The Agent System

### Routing

The orchestrator (`backend/services/agent/graph/router.js`) uses a **14-stage cascade** — first match wins:

1. **Explicit user selection** — a manually chosen agent always wins.
2. **Image upload** → `imageAnalyzer`
3. **Context reference resolution** — "turn that into a PDF" resolves the prior agent output
4. **Document format intent** → `pdf` / `ppt` / `pdfRag`
5. **Combined workflow detection** → chained `pdfRag → pdf`, `pdfRag → ppt`, `search → pdf`, `search → ppt`
6. **Live-information intent** → `search`
7. **Billing intent** → `billing`
8. **Image intent** → `vision` (generation or retrieval mode)
9. **Document upload** → `pdfRag`
10. **Follow-up on a previously uploaded document** → `pdfRag`
11. **Follow-up coding with a context reference** → `coding`
12. **Heuristic coding intent** → `coding`
13. **LLM intent classifier** — validated against the exact agent vocabulary
14. **Heuristic fallback** → `chat`

### The nine agents

| Agent | Capability | Credits |
|---|---|---|
| `chat` | General reasoning, explanations, synthesis | 1 |
| `search` | Real-time web research via Tavily, with citations | 5 |
| `coding` | Multi-file project generation, sandbox execution, live preview, ZIP download | 10 |
| `pdf` | Structured technical report rendered to a real PDF | 10 |
| `ppt` | Multi-slide deck rendered to a real `.pptx` | 10 |
| `vision` | Prompt-specific image generation (FLUX/SDXL chain) | 10 |
| `pdfRag` | Document parsing → embeddings → Qdrant retrieval → grounded answer | 10 |
| `imageAnalyzer` | Vision-language analysis of uploaded images | 10 |
| `billing` | Account, plan and credit questions answered from live data | 1 |

### Multi-agent handoffs

A single prompt can chain agents. *"Research the latest in agent orchestration and build me a slide deck"* routes `search → ppt`: the search agent collects live sources, the context is persisted to Redis, and the presentation agent consumes it — producing a cited deck rather than a generic one.

---

## Tech Stack

**Frontend** — React 19 · Vite 8 · Redux Toolkit · Tailwind CSS 4 · Monaco Editor · react-markdown + Prism · Motion · Firebase Web SDK · Razorpay Checkout

**Backend** — Node.js 22/24 · Express 5 · Mongoose 8 · ioredis · LangGraph · LangChain (Groq / Google GenAI / Tavily / Qdrant) · `@aws-sdk/client-s3` · Razorpay · pdfkit · pptxgenjs · mammoth · pdf-parse · xlsx · JSZip · multer

**Platform** — Docker (multi-stage, non-root) · Docker Compose · Nginx · GitHub Actions (CI + CD) · AWS EC2 · MongoDB Atlas · Redis 7

---

## Feature Tour

**Multi-agent routing** — pick a specialist manually, or let the router decide. The active agent is shown in the header and every answer is tagged with the agent that produced it.

**Artifact workspace** — a right-hand panel renders each artifact type natively:
- **Code** — Monaco editor with file tabs, syntax highlighting, copy, ZIP download and a **live sandboxed preview** of the generated HTML/CSS/JS
- **Presentation** — a custom 16:10 slide renderer with five layouts, thumbnail strip, fullscreen and `.pptx` download
- **PDF** — a styled document renderer with an execution summary, comparison matrices and PDF download

**Document RAG** — upload a PDF/Word/Excel/CSV; it is parsed, chunked, embedded with Gemini, stored in Qdrant, and retrieved for grounded answers.

**Voice input** — Web Speech API dictation with live interim transcription.

**File upload** — drag in documents and images with type detection, size badges and thumbnails.

**Billing** — Razorpay Checkout with server-side HMAC-SHA256 signature verification and idempotent credit allocation, plus a live credit balance in the sidebar.

**Multi-session** — conversation history persists in MongoDB with per-user ownership enforcement.

---

## Quick Start

### Prerequisites

- **Node.js 20+**
- **Docker** & **Docker Compose v2**
- A **MongoDB** instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A **Firebase** project with Google sign-in enabled

### Option A — Docker (recommended)

```bash
git clone https://github.com/ayuser2005/multiagentplatform.git
cd nexora-ai

cp .env.example .env
cp frontend/.env.example frontend/.env
# fill in .env with your credentials

docker compose -f docker-compose.prod.yml up -d --build
```

Open **http://localhost**

### Option B — Local development

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure the environment
cp .env.example .env
cp frontend/.env.example frontend/.env

# 3. Start Redis and MongoDB
docker run -d --name nexora-redis -p 6379:6379 redis:7-alpine
docker run -d --name nexora-mongo -p 27017:27017 mongo:7

# 4. Run the backend services (5 terminals, or use your IDE)
npm run dev:auth
npm run dev:chat
npm run dev:agent
npm run dev:billing
npm run dev:gateway

# 5. Run the frontend with hot reload
npm run dev:frontend
```

Open **http://localhost:5173** — Vite proxies `/api` to the gateway on `:8000`.

### Verifying the stack

```bash
curl http://localhost:8000/health   # gateway
curl http://localhost:8001/health   # auth
curl http://localhost:8002/health   # chat
curl http://localhost:8003/health   # agent
curl http://localhost:8004/health   # billing
```

---

## Environment Variables

Copy `.env.example` → `.env`. Everything is documented inline.

### Required

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `GROQ_API_KEY` | Primary LLM provider (chat, routing, coding, documents) |
| `GOOGLE_API_KEY` | Gemini embeddings + vision + failover model |
| `FIREBASE_SERVICE_ACCOUNT_PATH` / `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin credentials |
| `FRONTEND_URL` | Allowed browser origin(s), comma-separated |

### Provider integrations (optional)

| Variable | Enables |
|---|---|
| `TAVILY_API_KEY` | Web search agent + live-source enrichment |
| `QDRANT_URL` / `QDRANT_API_KEY` | Document RAG agent |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_KEY` / `AWS_BUCKET_NAME` | S3 artifact & image storage |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Paid plans |

### Platform

| Variable | Default | Purpose |
|---|---|---|
| `INTERNAL_SERVICE_SECRET` | — | Shared secret for service-to-service calls |
| `REDIS_URL` | `redis://redis:6379` | Session / cache / rate-limit store |
| `COOKIE_SECURE` | `false` | Set `true` once serving over HTTPS |
| `INTERNAL_CALL_TIMEOUT_MS` | `15000` | Timeout for intra-cluster HTTP calls |
| `MAX_PROMPT_LENGTH` | `20000` | Prompt size cap (cost protection) |

> **Missing keys never crash the platform.** Providers are resolved lazily, so an unconfigured service still boots, passes its health check, and simply reports that the corresponding agent is unavailable.

---

## API Reference

All routes are prefixed with `/api` and served by the gateway.

### Public

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Exchange a Firebase ID token for a session cookie |
| `GET` | `/api/auth/logout` | Destroy the session |
| `GET` | `/health` | Gateway liveness probe |

### Authenticated (session cookie required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/me` | Current user profile, plan and credit balance |
| `GET` | `/api/chat/create-conversation` | Start a conversation |
| `GET` | `/api/chat/get-conversations` | List the user's conversations |
| `POST` | `/api/chat/update-conversation` | Rename a conversation |
| `GET` | `/api/chat/get-messages/:id` | Fetch a conversation's messages |
| `POST` | `/api/agent/chat` | Run the agent orchestrator (`multipart/form-data`) |
| `GET` | `/api/agent/file/:name` | Preview a generated artifact |
| `GET` | `/api/agent/download/:name` | Download a generated artifact |
| `POST` | `/api/billing/create` | Create a Razorpay order |
| `POST` | `/api/billing/verify` | Verify payment signature and activate the plan |

### Internal only (never reachable from the internet)

`/api/auth/update-plan`, `/api/auth/deduct-credits`, `/api/auth/user/:id` — blocked at the gateway **and** protected by `INTERNAL_SERVICE_SECRET` inside the auth service.

---

## Deployment

The platform targets **AWS EC2 (Ubuntu 22.04/24.04)** with Docker Compose and Nginx.

```bash
chmod 400 deploy-key.pem
./deploy-to-ec2.sh <EC2_PUBLIC_IP>
```

The script installs Docker, provisions swap, rsyncs the source to `~/app`, and brings the stack up. For a full walkthrough — security groups, environment setup, TLS with Certbot, log inspection and rollback — see **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**.

### CI/CD

- **`ci.yml`** — runs on every push and pull request: agent unit tests, frontend lint, frontend build, a boot-and-health check of every backend service, and Docker image builds.
- **`deploy.yml`** — manual, service-selective deployment to EC2 via SSH + rsync, with post-deploy verification of every health endpoint.

Required repository secrets: `EC2_SSH_KEY`, `EC2_HOST`.

---

## Project Structure

```
nexora-ai/
├── backend/
│   ├── gateway/              # API gateway :8000
│   ├── shared/redis/         # Redis client with file-store fallback
│   └── services/
│       ├── auth/             # :8001  Firebase auth, sessions, credits
│       ├── chat/             # :8002  conversations & messages
│       ├── billing/          # :8004  Razorpay orders & verification
│       └── agent/            # :8003  LangGraph orchestrator
│           ├── agents/       # 9 specialist agents
│           ├── graph/        # router + state machine
│           ├── config/       # models, paths, limits, LLM providers
│           └── utils/        # sandbox, parsers, generators, storage
├── frontend/
│   └── src/
│       ├── components/       # chat, artifacts, sidebar, billing
│       ├── features/         # API layer
│       ├── redux/            # store + slices
│       └── constants/        # shared agent metadata
├── docs/
├── .github/workflows/        # CI + deploy pipelines
├── docker-compose.dev.yml    # local stack
├── docker-compose.prod.yml   # production stack
└── deploy-to-ec2.sh
```

---

## Security

| Concern | Mitigation |
|---|---|
| Session hijacking | `httpOnly` cookies, Redis-backed sessions with a 7-day TTL, `secure`/`sameSite` flags configurable per environment |
| CSRF | `sameSite=lax` cookies plus server-side session validation on every protected route |
| Origin spoofing | CORS origins matched **exactly** (never by prefix), with an explicit local-dev allowance |
| Privilege escalation | Credit/plan mutation endpoints blocked at the gateway *and* secret-gated inside the auth service |
| Broken access control | Conversation reads and writes are ownership-checked server-side (IDOR guard) |
| Path traversal | LLM-generated filenames are sanitised; every artifact path is resolved and asserted to stay inside the temp directory |
| Remote code execution | LLM-generated code runs in a VM context with `codeGeneration` disabled and Node globals shadowed; the JSDOM sandbox has all network primitives disabled (no SSRF) |
| Denial of service | Per-agent Redis rate limiting, upload type allow-list, 50 MB upload cap, prompt length cap, bounded conversation memory with TTL |
| Secret leakage | No credentials in source; every provider resolved from the environment; `.env` git-ignored; service-account files excluded from the Docker context |
| Information disclosure | Internal error details are never returned to the client; artifact downloads are session-guarded |

---

## Testing

```bash
npm test              # agent unit tests (node:test)
npm run lint          # frontend ESLint
npm run build         # frontend production build
npm run check         # all of the above
```

The agent suite covers the image prompt enhancer (prompt normalisation, style detection, scene classification, aspect-ratio resolution and intent-preservation guards).

CI additionally boots every backend service and asserts its `/health` endpoint responds.

---

## Roadmap

- [ ] Streaming responses (SSE) for the agent endpoint
- [ ] Per-user vector namespaces in Qdrant
- [ ] Prometheus metrics + Grafana dashboard
- [ ] Kubernetes manifests with HPA
- [ ] Playwright end-to-end suite
- [ ] WebSocket channel for push notifications

---

## License

Released under the [MIT License](LICENSE).

> Add a screenshot or short GIF of the workspace, and a link to the live demo, before publishing.

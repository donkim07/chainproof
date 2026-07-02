# ChainProof BAAS — Development Tracker

> Blockchain-as-a-Service for database tamper-proofing and forensic attribution.

## Phase 1: Foundation ✅
- [x] Project structure (`chainproof/`)
- [x] Architecture design (universal DB + per-tenant DB)
- [x] Docker Compose (Postgres + Fabric network)
- [x] Go backend scaffold with Gin
- [x] Universal DB migrations
- [x] Tenant DB migrations + provisioning
- [x] JWT auth (register, login, refresh)
- [x] RBAC (roles & permissions schema)
- [x] Run backend smoke test

## Phase 2: Blockchain Layer
- [x] Hyperledger Fabric docker-compose
- [x] Chaincode (`chainproof-integrity`)
- [x] Fabric gateway adapter (Node.js)
- [x] Go blockchain client service
- [ ] Bootstrap Fabric network scripts (needs crypto material generation)
- [ ] End-to-end anchor + verify test (requires Fabric running)

## Phase 3: Core Integrity Engine
- [x] Hash generation service (SHA-256 canonical JSON)
- [x] Anchor API (`POST /api/v1/integrity/anchor`)
- [x] Verify API (`POST /api/v1/integrity/verify`)
- [x] Integrity monitor (background scheduler)
- [x] Tamper incident creation
- [ ] Tamper attribution engine (audit log adapters per baas.md spec)
- [ ] PostgreSQL audit adapter
- [ ] MySQL audit adapter

## Phase 4: Integration Modes
- [x] Developer API mode (API keys + SDK examples in docs)
- [x] Proxy/gateway mode (register site URL, discover endpoints)
- [x] Endpoint protection selection
- [ ] Silent proxy middleware (Burp-like live capture — needs reverse proxy)
- [ ] Webhook notifications on tamper

## Phase 5: Frontend (Angular + Tailwind)
- [x] Angular project scaffold
- [x] Tailwind + design tokens (color psychology: trust=blue, safety=emerald, danger=rose)
- [x] Shared UI components (button, modal, toast — reusable)
- [x] Landing page
- [x] Pricing page
- [x] Developer docs (Go, Python, Node, PHP, Java, cURL)
- [x] Auth pages (login, register)
- [x] Dashboard layout (sidebar + responsive)
- [x] Sites management
- [x] Endpoints view
- [x] Tampering incidents table
- [x] API keys management
- [ ] Team & roles UI (schema ready, UI placeholder)
- [x] Toast alert templates in docs
- [ ] Banner templates for developers

## Phase 6: Super Admin & Billing
- [x] Super admin routes (platform DB)
- [x] Organization listing API
- [x] Subscription plans (Free, Pro, Enterprise)
- [ ] Payment status tracking (Stripe integration)
- [ ] Usage metering UI

## Phase 7: Polish & Production
- [ ] Subtle animations (page transitions, hover states)
- [ ] PDF forensic report export
- [ ] Email/Slack notification integrations
- [ ] Rate limiting per tenant
- [ ] CI/CD pipeline
- [ ] Full E2E test suite

---

## Quick Start

```bash
# 1. Start infrastructure
cd chainproof
docker compose up -d postgres fabric

# 2. Bootstrap Fabric (first time only)
./blockchain/fabric/scripts/bootstrap.sh

# 3. Start backend
cd backend && go run ./cmd/server

# 4. Start frontend
cd frontend && npm start
```

## Ports
| Service | Port |
|---------|------|
| Frontend (Angular) | 4200 |
| Go API | 8080 |
| Fabric Gateway | 8090 |
| Postgres (universal) | 5434 |
| Fabric CA | 7054 |

## Credentials (dev)
- Postgres: `postgres` / `admin123` @ `localhost:5434`
- Super Admin: `admin@chainproof.io` / `ChainProof2026!`
- Demo Org: register via UI

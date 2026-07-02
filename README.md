# ChainProof — Blockchain-as-a-Service

Tamper-proof your database records with Hyperledger Fabric blockchain anchoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ChainProof Platform                       │
├─────────────────┬───────────────────┬───────────────────────┤
│  Angular UI     │   Go API (:8080)  │  Fabric Gateway (:8090)│
│  (:4200)        │                   │                        │
├─────────────────┴───────────────────┴───────────────────────┤
│  Universal DB (chainproof_platform)  │  Per-Tenant DBs        │
│  - Organizations, billing, plans     │  - Sites, endpoints    │
│  - Super admin users                 │  - Integrity records   │
│                                      │  - Tamper incidents    │
└──────────────────────────────────────┴────────────────────────┘
                              │
                    Hyperledger Fabric Network
                    (chainproof-integrity chaincode)
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Go 1.24+
- Node.js 20+

### 1. Start PostgreSQL
```bash
cd chainproof
docker compose up -d postgres
```

### 2. Start Backend
```bash
cd backend
cp .env.example .env
go run ./cmd/server
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm start
```

Open http://localhost:4200

### Default Credentials
- **Super Admin:** admin@chainproof.io / ChainProof2026!
- **Postgres:** postgres / admin123 @ localhost:5434

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/register | Create org + owner account |
| POST | /api/v1/auth/login | Login, get JWT |
| POST | /api/v1/integrity/anchor | Anchor record hash to blockchain |
| POST | /api/v1/integrity/verify | Verify record integrity |
| GET | /api/v1/tampering | List tamper incidents |
| POST | /api/v1/sites | Register a website |
| POST | /api/v1/sites/:id/discover | Auto-discover API endpoints |

## Integration Modes

1. **Developer API** — REST API + SDKs (Go, Python, Node, PHP, Java)
2. **Proxy Mode** — Enter backend URL, auto-discover endpoints, silent capture

## Hyperledger Fabric

Fabric network runs via Docker Compose profile:
```bash
docker compose --profile fabric up -d
```

See `blockchain/fabric/` for chaincode and gateway adapter.

## Progress Tracker

See [TODO.md](./TODO.md) for development status.

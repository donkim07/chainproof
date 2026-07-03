#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building chaincode image locally..."
docker compose build ccaas.chainproof-integrity fabric-gateway

if [ ! -f blockchain/fabric/crypto/peer/tls/ca.crt ]; then
  echo "==> Fabric crypto not found — running bootstrap (dev)..."
  bash blockchain/fabric/scripts/bootstrap.sh || echo "Warning: bootstrap failed; gateway may not connect until crypto exists."
fi

echo "==> Starting Fabric profile..."
docker compose --profile fabric up -d

echo "Done. Gateway: http://localhost:8090/health"

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${ROOT_DIR}/../.." && pwd)"
CHANNEL_NAME="${CHANNEL_NAME:-chainproof-channel}"

cd "${REPO_ROOT}"

if [[ ! -d "${ROOT_DIR}/organizations/peerOrganizations/chainproof.local" ]]; then
  echo "Crypto material missing. Running bootstrap..."
  bash "${SCRIPT_DIR}/bootstrap-network.sh"
fi

CHANNEL_BLOCK="${ROOT_DIR}/channel-artifacts/${CHANNEL_NAME}.block"
if [[ ! -f "${CHANNEL_BLOCK}" ]]; then
  bash "${SCRIPT_DIR}/bootstrap-network.sh"
fi

echo "Starting ChainProof Fabric infrastructure..."
docker compose --profile fabric up -d --force-recreate \
  ca.chainproof.local couchdb.chainproof.local \
  orderer0.chainproof.local peer0.chainproof.local

echo "Waiting for peer and orderer..."
sleep 8

echo "Ensuring channel membership..."
bash "${SCRIPT_DIR}/create-channel.sh"

if ! docker ps --format '{{.Names}}' | grep -q 'ccaas.chainproof-integrity'; then
  echo "Deploying external chaincode..."
  bash "${SCRIPT_DIR}/deploy-chaincode-external.sh"
fi

echo "Building and starting gateway adapter..."
docker compose --profile fabric up -d --build fabric-gateway

echo ""
echo "ChainProof Fabric stack ready:"
echo "  Gateway health: http://localhost:8091/health"
echo "  Set FABRIC_DEV_MOCK=false in backend/.env for real anchoring"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FABRIC_DIR="$ROOT_DIR/fabric"

echo "==> ChainProof Fabric bootstrap"
echo "Working directory: $FABRIC_DIR"

cd "$FABRIC_DIR"

if [[ ! -d "crypto" ]]; then
  echo "Creating crypto placeholders (dev mode)."
  mkdir -p crypto/orderer crypto/peer crypto/user/chainproof-admin/chainproof-admin/msp/{keystore,signcerts}
  touch crypto/peer/tls/ca.crt crypto/peer/tls/server.crt crypto/peer/tls/server.key
  touch crypto/orderer/tls/ca.crt crypto/orderer/tls/server.crt crypto/orderer/tls/server.key
  touch crypto/user/chainproof-admin/chainproof-admin/msp/signcerts/cert.pem
  touch crypto/user/chainproof-admin/chainproof-admin/msp/keystore/key.pem
fi

echo "==> Building chaincode and gateway images"
docker build -t chainproof-chaincode:latest ./chaincode/chainproof-integrity
docker build -t chainproof-fabric-gateway:latest ./gateway-adapter

echo "==> Starting fabric profile"
cd "$ROOT_DIR"
docker compose --profile fabric up -d ca.chainproof.local couchdb.chainproof.local orderer0.chainproof.local peer0.chainproof.local ccaas.chainproof-integrity fabric-gateway

echo "Bootstrap complete."
echo "Note: for production-grade crypto/channel artifacts, run cryptogen/configtxgen from Hyperledger Fabric binaries."

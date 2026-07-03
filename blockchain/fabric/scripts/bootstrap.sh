#!/usr/bin/env bash
set -euo pipefail

# chainproof/ (repo root for docker compose)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
FABRIC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> ChainProof Fabric bootstrap"
echo "Repo root: $ROOT_DIR"
echo "Fabric dir: $FABRIC_DIR"

cd "$FABRIC_DIR"

ensure_dev_crypto() {
  echo "==> Ensuring dev crypto placeholders (gateway TLS + MSP paths)"
  mkdir -p crypto/orderer/msp/{keystore,signcerts,cacerts,admincerts}
  mkdir -p crypto/orderer/tls
  mkdir -p crypto/peer/msp/{keystore,signcerts,cacerts,admincerts}
  mkdir -p crypto/peer/tls
  mkdir -p crypto/user/chainproof-admin/chainproof-admin/msp/{keystore,signcerts,cacerts}

  for f in \
    crypto/orderer/tls/ca.crt crypto/orderer/tls/server.crt crypto/orderer/tls/server.key \
    crypto/peer/tls/ca.crt crypto/peer/tls/server.crt crypto/peer/tls/server.key \
    crypto/peer/msp/signcerts/cert.pem crypto/peer/msp/keystore/key.pem \
    crypto/orderer/msp/signcerts/cert.pem crypto/orderer/msp/keystore/key.pem \
    crypto/user/chainproof-admin/chainproof-admin/msp/signcerts/cert.pem \
    crypto/user/chainproof-admin/chainproof-admin/msp/keystore/key.pem; do
    if [[ ! -s "$f" ]]; then
      touch "$f"
    fi
  done
}

ensure_dev_crypto

echo "==> Building chaincode and gateway images"
docker build -t chainproof-chaincode:latest ./chaincode/chainproof-integrity
docker build -t chainproof-fabric-gateway:latest ./gateway-adapter

echo "==> Starting fabric profile"
cd "$ROOT_DIR"
docker compose --profile fabric up -d ca.chainproof.local couchdb.chainproof.local orderer0.chainproof.local peer0.chainproof.local ccaas.chainproof-integrity fabric-gateway

echo ""
echo "Bootstrap complete."
echo "  Gateway health: http://localhost:8090/health"
echo "  Note: placeholder crypto is for gateway dev only. Peer/orderer need cryptogen or Fabric CA for production."
echo "  Backend FABRIC_DEV_MOCK=true (default) anchors without a live peer."

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CHANNEL_NAME="${CHANNEL_NAME:-chainproof-channel}"

cd "${ROOT_DIR}"

echo "Preparing directories..."
rm -rf "${ROOT_DIR}/organizations"
mkdir -p "${ROOT_DIR}/organizations" "${ROOT_DIR}/channel-artifacts"

echo "Generating crypto material with cryptogen..."
docker run --rm \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  cryptogen generate --config=/work/config/crypto-config.yaml --output=/work/organizations

echo "Generating channel block with configtxgen..."
docker run --rm \
  -e FABRIC_CFG_PATH=/work/config \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  configtxgen -profile ChainProofChannel -outputBlock "/work/channel-artifacts/${CHANNEL_NAME}.block" -channelID "${CHANNEL_NAME}"

echo "Bootstrap completed."

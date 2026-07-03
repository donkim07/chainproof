#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CHANNEL_NAME="${CHANNEL_NAME:-chainproof-channel}"
CHANNEL_BLOCK="${ROOT_DIR}/channel-artifacts/${CHANNEL_NAME}.block"
NETWORK="${FABRIC_NETWORK:-chainproof_net}"

if [[ ! -f "${CHANNEL_BLOCK}" ]]; then
  echo "Channel block not found at ${CHANNEL_BLOCK}. Run bootstrap-network.sh first." >&2
  exit 1
fi

echo "Joining orderer to application channel via osnadmin..."
docker run --rm --network "${NETWORK}" \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  osnadmin channel join \
    --channelID "${CHANNEL_NAME}" \
    --config-block "/work/channel-artifacts/${CHANNEL_NAME}.block" \
    --orderer-address orderer0.chainproof.local:7053 \
    --ca-file /work/organizations/ordererOrganizations/chainproof.local/orderers/orderer0.chainproof.local/tls/ca.crt \
    --client-cert /work/organizations/ordererOrganizations/chainproof.local/users/Admin@chainproof.local/tls/client.crt \
    --client-key /work/organizations/ordererOrganizations/chainproof.local/users/Admin@chainproof.local/tls/client.key \
  || echo "Orderer may already be joined; continuing."

echo "Joining peer0.chainproof.local..."
docker run --rm --network "${NETWORK}" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID=ChainProofMSP \
  -e CORE_PEER_MSPCONFIGPATH=/work/organizations/peerOrganizations/chainproof.local/users/Admin@chainproof.local/msp \
  -e CORE_PEER_ADDRESS=peer0.chainproof.local:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/work/organizations/peerOrganizations/chainproof.local/peers/peer0.chainproof.local/tls/ca.crt \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  peer channel join -b "/work/channel-artifacts/${CHANNEL_NAME}.block" \
  || echo "Peer may already be joined; continuing."

echo "Channel creation and peer join completed."

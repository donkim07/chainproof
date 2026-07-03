#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CHANNEL_NAME="${CHANNEL_NAME:-chainproof-channel}"
CC_NAME="${CC_NAME:-chainproof-integrity}"
CC_LABEL="${CC_LABEL:-chainproof-integrity_1}"
CC_VERSION="${CC_VERSION:-1.0}"
CC_SEQUENCE="${CC_SEQUENCE:-1}"
CC_CONTAINER_NAME="${CC_CONTAINER_NAME:-ccaas.chainproof-integrity}"
CC_ADDRESS="${CC_ADDRESS:-ccaas.chainproof-integrity:9999}"
CC_PACKAGE="${ROOT_DIR}/${CC_NAME}-external.tgz"
CC_BUILD_CONTEXT="${ROOT_DIR}/chaincode/chainproof-integrity"
TMP_DIR="${ROOT_DIR}/.ccpkg"
NETWORK="${FABRIC_NETWORK:-chainproof_net}"
ORG_DOMAIN="chainproof.local"
MSP_ID="ChainProofMSP"

echo "Preparing external chaincode package..."
rm -rf "${TMP_DIR}"
mkdir -p "${TMP_DIR}"

cat > "${TMP_DIR}/connection.json" <<EOF
{
  "address": "${CC_ADDRESS}",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

cat > "${TMP_DIR}/metadata.json" <<EOF
{
  "type": "ccaas",
  "label": "${CC_LABEL}"
}
EOF

tar -czf "${TMP_DIR}/code.tar.gz" -C "${TMP_DIR}" connection.json metadata.json

cat > "${TMP_DIR}/outer-metadata.json" <<EOF
{
  "path": "",
  "type": "ccaas",
  "label": "${CC_LABEL}"
}
EOF

mv -f "${TMP_DIR}/outer-metadata.json" "${TMP_DIR}/metadata.json"
tar -czf "${CC_PACKAGE}" -C "${TMP_DIR}" metadata.json code.tar.gz

echo "Installing external package on ChainProofMSP..."
docker run --rm --network "${NETWORK}" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID="${MSP_ID}" \
  -e CORE_PEER_MSPCONFIGPATH="/work/organizations/peerOrganizations/${ORG_DOMAIN}/users/Admin@${ORG_DOMAIN}/msp" \
  -e CORE_PEER_ADDRESS=peer0.chainproof.local:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE="/work/organizations/peerOrganizations/${ORG_DOMAIN}/peers/peer0.chainproof.local/tls/ca.crt" \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  peer lifecycle chaincode install "/work/${CC_NAME}-external.tgz"

echo "Querying package ID..."
QUERY_INSTALLED=$(docker run --rm --network "${NETWORK}" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID="${MSP_ID}" \
  -e CORE_PEER_MSPCONFIGPATH="/work/organizations/peerOrganizations/${ORG_DOMAIN}/users/Admin@${ORG_DOMAIN}/msp" \
  -e CORE_PEER_ADDRESS=peer0.chainproof.local:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE="/work/organizations/peerOrganizations/${ORG_DOMAIN}/peers/peer0.chainproof.local/tls/ca.crt" \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  peer lifecycle chaincode queryinstalled)

PACKAGE_ID=$(echo "${QUERY_INSTALLED}" | grep "Label: ${CC_LABEL}" | head -1 | sed 's/Package ID: //; s/, Label:.*//')
if [[ -z "${PACKAGE_ID}" ]]; then
  echo "Could not find package ID for label ${CC_LABEL}" >&2
  exit 1
fi
echo "Package ID: ${PACKAGE_ID}"

echo "Starting external chaincode service container..."
docker rm -f "${CC_CONTAINER_NAME}" 2>/dev/null || true
docker build -t chainproof-chaincode:latest "${CC_BUILD_CONTEXT}"
docker run -d --name "${CC_CONTAINER_NAME}" --network "${NETWORK}" \
  -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
  -e CHAINCODE_ID="${PACKAGE_ID}" \
  chainproof-chaincode:latest

echo "Approving chaincode for ChainProofMSP..."
docker run --rm --network "${NETWORK}" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID="${MSP_ID}" \
  -e CORE_PEER_MSPCONFIGPATH="/work/organizations/peerOrganizations/${ORG_DOMAIN}/users/Admin@${ORG_DOMAIN}/msp" \
  -e CORE_PEER_ADDRESS=peer0.chainproof.local:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE="/work/organizations/peerOrganizations/${ORG_DOMAIN}/peers/peer0.chainproof.local/tls/ca.crt" \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  peer lifecycle chaincode approveformyorg \
    --orderer orderer0.chainproof.local:7050 \
    --ordererTLSHostnameOverride orderer0.chainproof.local \
    --tls \
    --cafile "/work/organizations/ordererOrganizations/${ORG_DOMAIN}/orderers/orderer0.chainproof.local/tls/ca.crt" \
    --channelID "${CHANNEL_NAME}" \
    --name "${CC_NAME}" \
    --version "${CC_VERSION}" \
    --sequence "${CC_SEQUENCE}" \
    --package-id "${PACKAGE_ID}"

echo "Committing chaincode definition..."
docker run --rm --network "${NETWORK}" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID="${MSP_ID}" \
  -e CORE_PEER_MSPCONFIGPATH="/work/organizations/peerOrganizations/${ORG_DOMAIN}/users/Admin@${ORG_DOMAIN}/msp" \
  -e CORE_PEER_ADDRESS=peer0.chainproof.local:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE="/work/organizations/peerOrganizations/${ORG_DOMAIN}/peers/peer0.chainproof.local/tls/ca.crt" \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  peer lifecycle chaincode commit \
    --orderer orderer0.chainproof.local:7050 \
    --ordererTLSHostnameOverride orderer0.chainproof.local \
    --tls \
    --cafile "/work/organizations/ordererOrganizations/${ORG_DOMAIN}/orderers/orderer0.chainproof.local/tls/ca.crt" \
    --channelID "${CHANNEL_NAME}" \
    --name "${CC_NAME}" \
    --version "${CC_VERSION}" \
    --sequence "${CC_SEQUENCE}" \
    --peerAddresses peer0.chainproof.local:7051 \
    --tlsRootCertFiles "/work/organizations/peerOrganizations/${ORG_DOMAIN}/peers/peer0.chainproof.local/tls/ca.crt"

echo "Verifying committed chaincode..."
docker run --rm --network "${NETWORK}" \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID="${MSP_ID}" \
  -e CORE_PEER_MSPCONFIGPATH="/work/organizations/peerOrganizations/${ORG_DOMAIN}/users/Admin@${ORG_DOMAIN}/msp" \
  -e CORE_PEER_ADDRESS=peer0.chainproof.local:7051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE="/work/organizations/peerOrganizations/${ORG_DOMAIN}/peers/peer0.chainproof.local/tls/ca.crt" \
  -v "${ROOT_DIR}:/work" \
  -w /work \
  hyperledger/fabric-tools:2.5.11 \
  peer lifecycle chaincode querycommitted --channelID "${CHANNEL_NAME}" --name "${CC_NAME}"

echo "External chaincode deployment complete."

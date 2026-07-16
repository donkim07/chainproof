'use strict';

const crypto = require('crypto');
const fs = require('fs');
const grpc = require('@grpc/grpc-js');
const express = require('express');
const { connect, signers, hash } = require('@hyperledger/fabric-gateway');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8090;
const API_KEY = process.env.API_KEY || '';

function readPrivateKeySigner() {
  const privateKeyPem = fs.readFileSync(process.env.FABRIC_ID_KEY_PATH);
  return signers.newPrivateKeySigner(crypto.createPrivateKey(privateKeyPem));
}

function buildGateway() {
  const tlsRootCert = fs.readFileSync(process.env.FABRIC_TLS_CERT_PATH);
  const credentials = grpc.credentials.createSsl(tlsRootCert);
  const client = new grpc.Client(process.env.FABRIC_PEER_ENDPOINT, credentials, {
    'grpc.ssl_target_name_override': process.env.FABRIC_PEER_HOST_ALIAS
  });

  const cert = fs.readFileSync(process.env.FABRIC_ID_CERT_PATH);
  const gateway = connect({
    client,
    identity: { mspId: process.env.FABRIC_MSP_ID || 'ChainProofMSP', credentials: cert },
    signer: readPrivateKeySigner(),
    hash: hash.sha256
  });

  const network = gateway.getNetwork(process.env.FABRIC_CHANNEL || 'chainproof-channel');
  const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'chainproof-integrity');
  return { client, gateway, contract };
}

// Built once and reused for the life of the process instead of per-request — see
// eardhi-backend's gateway-adapter fix for why (per-request TLS/gRPC setup caused the
// CPU/memory exhaustion that got a sibling container OOM-killed on the shared host).
let gatewayConnPromise = null;

function getConnection() {
  if (!gatewayConnPromise) {
    gatewayConnPromise = Promise.resolve()
      .then(buildGateway)
      .catch((err) => {
        gatewayConnPromise = null;
        throw err;
      });
  }
  return gatewayConnPromise;
}

function isTransportError(err) {
  const code = err && err.code;
  return code === grpc.status.UNAVAILABLE
    || code === grpc.status.CANCELLED
    || code === grpc.status.DEADLINE_EXCEEDED;
}

async function withContract(fn) {
  const conn = await getConnection();
  try {
    return await fn(conn.contract);
  } catch (err) {
    if (isTransportError(err)) {
      gatewayConnPromise = null;
      try {
        conn.gateway.close();
        conn.client.close();
      } catch (_closeErr) {
        // connection already broken; nothing to clean up
      }
    }
    throw err;
  }
}

function checkApiKey(req, res) {
  if (API_KEY && req.header('X-API-Key') !== API_KEY) {
    res.status(401).json({ success: false, error: 'Invalid API key' });
    return false;
  }
  return true;
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'chainproof-fabric-gateway' });
});

app.post('/api/v1/anchors/integrity', async (req, res) => {
  if (!checkApiKey(req, res)) return;
  try {
    const resultBytes = await withContract((contract) =>
      contract.submitTransaction('anchorIntegrity', JSON.stringify(req.body || {})));
    let result = { success: true };
    if (resultBytes?.length) result = JSON.parse(Buffer.from(resultBytes).toString());
    res.json({ success: true, txId: result.txId || null });
  } catch (error) {
    res.status(500).json({ success: false, txId: null, error: error.message });
  }
});

app.get('/api/v1/anchors/integrity/verify', async (req, res) => {
  if (!checkApiKey(req, res)) return;
  try {
    const { tenantId, entityType, entityUid, recordHash } = req.query;
    const resultBytes = await withContract((contract) =>
      contract.evaluateTransaction('queryIntegrity', tenantId || 'global', entityType, entityUid, recordHash));
    const data = resultBytes?.length ? Buffer.from(resultBytes).toString() : '';
    if (!data) return res.json({ found: false, txId: null });
    const anchor = JSON.parse(data);
    res.json({ found: true, txId: anchor.txId || null, anchor });
  } catch (error) {
    res.status(500).json({ found: false, error: error.message });
  }
});

const server = app.listen(PORT, () => console.log(`ChainProof gateway on :${PORT}`));

async function shutdown() {
  server.close();
  if (gatewayConnPromise) {
    try {
      const conn = await gatewayConnPromise;
      conn.gateway.close();
      conn.client.close();
    } catch (_err) {
      // never connected or already broken; nothing to close
    }
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

'use strict';

const { Contract } = require('fabric-contract-api');

class ChainProofIntegrityContract extends Contract {
  async anchorIntegrity(ctx, payloadJson) {
    const payload = JSON.parse(payloadJson);
    const key = ctx.stub.createCompositeKey('INTEGRITY', [
      payload.tenantId || 'global',
      payload.entityType,
      payload.entityUid,
      payload.recordHash
    ]);

    const existing = await ctx.stub.getState(key);
    if (existing && existing.length > 0) {
      return JSON.stringify({ success: true, txId: ctx.stub.getTxID(), duplicate: true });
    }

    const now = ctx.stub.getTxTimestamp();
    const anchor = {
      tenantId: payload.tenantId || null,
      entityType: payload.entityType,
      entityUid: payload.entityUid,
      action: payload.action || 'ANCHOR',
      actorUid: payload.actorUid || null,
      payloadHash: payload.payloadHash,
      recordHash: payload.recordHash,
      previousRecordHash: payload.previousRecordHash || null,
      txId: ctx.stub.getTxID(),
      anchoredAt: `${now.seconds.low}`
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(anchor)));
    return JSON.stringify({ success: true, txId: anchor.txId });
  }

  async queryIntegrity(ctx, tenantId, entityType, entityUid, recordHash) {
    const key = ctx.stub.createCompositeKey('INTEGRITY', [tenantId || 'global', entityType, entityUid, recordHash]);
    const data = await ctx.stub.getState(key);
    if (!data || data.length === 0) return '';
    return data.toString();
  }
}

module.exports.contracts = [ChainProofIntegrityContract];

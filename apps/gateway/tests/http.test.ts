import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Context } from 'moleculer'
import { applyHttpMeta, normalizeMsParams } from '../src/http.js'

describe('normalizeMsParams', () => {
  it('maps REST path params to snake_case action params', () => {
    const params = normalizeMsParams({
      batchCode: 'BATCH-SEED-001',
      bomCode: 'BOM-SEED-001',
      userId: 'user-1'
    })
    assert.equal(params.batch_code, 'BATCH-SEED-001')
    assert.equal(params.bom_code, 'BOM-SEED-001')
    assert.equal(params.id, 'user-1')
  })

  it('maps lotNumber REST param to lotId', () => {
    const params = normalizeMsParams({
      lotNumber: 'BATCH-SEED-001'
    })
    assert.equal(params.lotId, 'BATCH-SEED-001')
  })
})

describe('applyHttpMeta', () => {
  it('normalizes moleculer-web request params before action call', () => {
    const ctx = { meta: {}, params: { req: {}, res: {} } } as Context
    const req = {
      headers: { authorization: 'Bearer token-123' },
      $params: { batchCode: 'BATCH-SEED-001', limit: '50' }
    }

    applyHttpMeta(ctx, req)

    assert.equal((ctx.meta as { accessToken?: string }).accessToken, 'token-123')
    assert.equal((ctx.params as { batch_code?: string }).batch_code, 'BATCH-SEED-001')
    assert.equal(req.$params?.batch_code, 'BATCH-SEED-001')
    assert.equal(req.$params?.accessToken, 'token-123')
  })
})

/**
 * Adapter Moleculer — Production
 * Routes gateway prévues :
 *   GET  /api/v1/production/bom        → production.bom.list
 *   POST /api/v1/production/bom          → production.bom.create
 *   GET  /api/v1/production/batches      → production.batch.list
 *   POST /api/v1/production/batches        → production.batch.create
 *   PATCH /api/v1/production/batches/:id/progress → production.batch.progress
 *   POST /api/v1/production/batches/:id/anomalies → production.batch.addAnomalies
 */
import { useApiClient } from '~/lib/api/client'
import type { ProductionAdapter } from '~/lib/adapters/types'

export function createMoleculerProductionAdapter(getToken: () => string | null): ProductionAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    listBomOrders() {
      return request('/v1/production/bom', { accessToken: token() })
    },
    createBomOrder(input) {
      return request('/v1/production/bom', { method: 'POST', body: input, accessToken: token() })
    },
    updateBomOrder(input) {
      return request(`/v1/production/bom/${input.id}`, { method: 'PATCH', body: { bom: input.bom }, accessToken: token() })
    },
    updateBomOrderStatus(id, status) {
      return request(`/v1/production/bom/${id}/status`, { method: 'PATCH', body: { status }, accessToken: token() })
    },
    listBatches() {
      return request('/v1/production/batches', { accessToken: token() })
    },
    createBatch(input) {
      return request('/v1/production/batches', { method: 'POST', body: input, accessToken: token() })
    },
    updateBatchStatus(id, status) {
      return request(`/v1/production/batches/${id}/progress`, { method: 'PATCH', body: { status }, accessToken: token() })
    },
    reportAnomaly(input) {
      return request(`/v1/production/batches/${input.batchId}/anomalies`, {
        method: 'POST',
        body: { description: input.description },
        accessToken: token()
      })
    },
    clearAnomaly(batchId) {
      return request(`/v1/production/batches/${batchId}/anomalies`, {
        method: 'DELETE',
        accessToken: token()
      })
    }
  }
}

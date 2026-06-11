/**
 * Adapter Moleculer — Production
 * Routes gateway prévues :
 *   GET  /api/production/bom        → production.bom.list
 *   POST /api/production/bom          → production.bom.create
 *   GET  /api/production/batches      → production.batch.list
 *   POST /api/production/batches        → production.batch.create
 *   PATCH /api/production/batches/:id/progress → production.batch.progress
 *   POST /api/production/batches/:id/anomalies → production.batch.addAnomalies
 */
import { useApiClient } from '~/lib/api/client'
import type { ProductionAdapter } from '~/lib/adapters/types'

export function createMoleculerProductionAdapter(getToken: () => string | null): ProductionAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    listBomOrders() {
      return request('/production/bom', { accessToken: token() })
    },
    createBomOrder(input) {
      return request('/production/bom', { method: 'POST', body: input, accessToken: token() })
    },
    updateBomOrder(input) {
      return request(`/production/bom/${input.id}`, { method: 'PATCH', body: { bom: input.bom }, accessToken: token() })
    },
    updateBomOrderStatus(id, status) {
      return request(`/production/bom/${id}/status`, { method: 'PATCH', body: { status }, accessToken: token() })
    },
    listBatches() {
      return request('/production/batches', { accessToken: token() })
    },
    createBatch(input) {
      return request('/production/batches', { method: 'POST', body: input, accessToken: token() })
    },
    updateBatchStatus(id, status) {
      return request(`/production/batches/${id}/progress`, { method: 'PATCH', body: { status }, accessToken: token() })
    },
    reportAnomaly(input) {
      return request(`/production/batches/${input.batchId}/anomalies`, {
        method: 'POST',
        body: { description: input.description },
        accessToken: token()
      })
    },
    clearAnomaly(batchId) {
      return request(`/production/batches/${batchId}/anomalies`, {
        method: 'DELETE',
        accessToken: token()
      })
    },
    reportBomAnomaly(input) {
      return request(`/production/bom/${input.bomOrderId}/anomalies`, {
        method: 'POST',
        body: { description: input.description },
        accessToken: token()
      })
    }
  }
}

/**
 * Adapter Moleculer — Order
 * Routes gateway prévues :
 *   GET    /api/v1/orders                    → order.list
 *   POST   /api/v1/orders                    → order.create
 *   PATCH  /api/v1/orders/:id/status          → order.status
 *   POST   /api/v1/orders/:id/validate       → order.order.validated
 *   POST   /api/v1/orders/:id/reject         → order.order.rejected
 *   PATCH  /api/v1/orders/:id/priority       → order.order.priority.changed
 */
import { useApiClient } from '~/lib/api/client'
import type { OrderAdapter } from '~/lib/adapters/types'

export function createMoleculerOrderAdapter(getToken: () => string | null): OrderAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    list() {
      return request('/v1/orders', { accessToken: token() })
    },
    create(input) {
      return request('/v1/orders', { method: 'POST', body: input, accessToken: token() })
    },
    updateStatus(id, status) {
      return request(`/v1/orders/${id}/status`, { method: 'PATCH', body: { status }, accessToken: token() })
    },
    validate(id) {
      return request(`/v1/orders/${id}/validate`, { method: 'POST', accessToken: token() })
    },
    reject(id) {
      return request(`/v1/orders/${id}/reject`, { method: 'POST', accessToken: token() })
    },
    changePriority(id, priority) {
      return request(`/v1/orders/${id}/priority`, { method: 'PATCH', body: { priority }, accessToken: token() })
    },
    reportAnomaly(id) {
      return request(`/v1/orders/${id}/anomaly`, { method: 'POST', accessToken: token() })
    },
    clearAnomaly(id) {
      return request(`/v1/orders/${id}/anomaly`, { method: 'DELETE', accessToken: token() })
    }
  }
}

/**
 * Adapter Moleculer — Order
 * Routes gateway prévues :
 *   GET    /api/orders                    → order.list
 *   POST   /api/orders                    → order.create
 *   PATCH  /api/orders/:id/status          → order.status
 *   POST   /api/orders/:id/validate       → order.order.validated
 *   POST   /api/orders/:id/reject         → order.order.rejected
 *   PATCH  /api/orders/:id/priority       → order.order.priority.changed
 */
import { useApiClient } from '~/lib/api/client'
import type { OrderAdapter } from '~/lib/adapters/types'

export function createMoleculerOrderAdapter(getToken: () => string | null): OrderAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    list() {
      return request('/orders', { accessToken: token() })
    },
    create(input) {
      return request('/orders', { method: 'POST', body: input, accessToken: token() })
    },
    updateStatus(id, status) {
      return request(`/orders/${id}/status`, { method: 'PATCH', body: { status }, accessToken: token() })
    },
    validate(id) {
      return request(`/orders/${id}/validate`, { method: 'POST', accessToken: token() })
    },
    reject(id) {
      return request(`/orders/${id}/reject`, { method: 'POST', accessToken: token() })
    },
    changePriority(id, priority) {
      return request(`/orders/${id}/priority`, { method: 'PATCH', body: { priority }, accessToken: token() })
    },
    reportAnomaly(id) {
      return request(`/orders/${id}/anomaly`, { method: 'POST', accessToken: token() })
    },
    clearAnomaly(id) {
      return request(`/orders/${id}/anomaly`, { method: 'DELETE', accessToken: token() })
    },
    getClientStats(client) {
      return request(`/orders/clients/${encodeURIComponent(client)}/stats`, { accessToken: token() })
    },
    getOrderHistory(orderId) {
      return request(`/orders/${orderId}/history`, { accessToken: token() })
    }
  }
}

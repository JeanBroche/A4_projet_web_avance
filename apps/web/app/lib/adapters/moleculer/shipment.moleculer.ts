/**
 * Adapter Moleculer — Shipment
 * Routes gateway prévues :
 *   GET  /api/shipments              → shipment.get / history
 *   POST /api/shipments              → picklist.create
 *   PATCH /api/shipments/:id/status  → shipment.updateStatus
 */
import { useApiClient } from '~/lib/api/client'
import type { ShipmentAdapter } from '~/lib/adapters/types'

export function createMoleculerShipmentAdapter(getToken: () => string | null): ShipmentAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    list() {
      return request('/shipments', { accessToken: token() })
    },
    create(input) {
      return request('/shipments', { method: 'POST', body: input, accessToken: token() })
    },
    updateStatus(id, status) {
      return request(`/shipments/${id}/status`, { method: 'PATCH', body: { status }, accessToken: token() })
    }
  }
}

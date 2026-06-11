/**
 * Adapter Moleculer — Shipment
 * Routes gateway prévues :
 *   GET  /api/v1/shipments              → shipment.get / history
 *   POST /api/v1/shipments              → picklist.create
 *   PATCH /api/v1/shipments/:id/status  → shipment.updateStatus
 */
import { useApiClient } from '~/lib/api/client'
import type { ShipmentAdapter } from '~/lib/adapters/types'

export function createMoleculerShipmentAdapter(getToken: () => string | null): ShipmentAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    list() {
      return request('/v1/shipments', { accessToken: token() })
    },
    create(input) {
      return request('/v1/shipments', { method: 'POST', body: input, accessToken: token() })
    },
    updateStatus(id, status) {
      return request(`/v1/shipments/${id}/status`, { method: 'PATCH', body: { status }, accessToken: token() })
    }
  }
}

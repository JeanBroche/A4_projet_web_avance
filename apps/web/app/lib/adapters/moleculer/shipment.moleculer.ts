import { useApiClient } from '~/lib/api/client'
import type { ShipmentAdapter } from '~/lib/adapters/types'
import { mapShipmentToUi, mapUiShipmentStatus } from '~/lib/mappers/shipment'
import { isCuidLike, resolveStringIdByNumeric } from '~/lib/mappers/resolve-id'

export function createMoleculerShipmentAdapter(
  getToken: () => string | null,
  getSiteCode: () => string
): ShipmentAdapter {
  const { request } = useApiClient()
  const token = () => getToken()
  const siteCode = () => getSiteCode()

  async function resolveShipmentId(id: number | string): Promise<string | null> {
    if (isCuidLike(String(id))) return String(id)
    const history = await request<{ items: Array<Record<string, unknown>> }>(
      '/logistics/shipments',
      { accessToken: token() }
    )
    return resolveStringIdByNumeric(history.items ?? [], id)
  }

  return {
    async list() {
      const result = await request<{ items: Array<Parameters<typeof mapShipmentToUi>[0]> }>(
        '/logistics/shipments',
        { accessToken: token() }
      )
      return (result.items ?? []).map(mapShipmentToUi)
    },

    async create(input) {
      const orderNumber = input.orderNumber ?? `ORD-${Date.now()}`
      const picklist = await request<{ pickList: { id: string } }>('/logistics/picklists', {
        method: 'POST',
        body: {
          orderNumber,
          clientCode: input.client,
          siteCode: siteCode(),
          lines: [{ productCode: input.productCode ?? 'PROD-GENERIC', quantity: 1 }]
        },
        accessToken: token()
      })
      await request(`/logistics/picklists/${encodeURIComponent(picklist.pickList.id)}/complete`, {
        method: 'POST',
        accessToken: token()
      })
      const planned = await request<{ shipment: Parameters<typeof mapShipmentToUi>[0] }>(
        '/logistics/shipments/plan',
        {
          method: 'POST',
          body: { pickListId: picklist.pickList.id, carrier: input.carrier },
          accessToken: token()
        }
      )
      return mapShipmentToUi(planned.shipment)
    },

    async updateStatus(id, status) {
      const shipmentId = await resolveShipmentId(id)
      if (!shipmentId) throw new Error('NOT_FOUND')
      const updated = await request<{ shipment: Parameters<typeof mapShipmentToUi>[0] }>(
        `/logistics/shipments/${encodeURIComponent(shipmentId)}/status`,
        {
          method: 'PATCH',
          body: { status: mapUiShipmentStatus(status) },
          accessToken: token()
        }
      )
      return mapShipmentToUi(updated.shipment)
    }
  }
}

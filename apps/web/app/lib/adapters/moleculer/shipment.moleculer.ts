import { useApiClient } from '~/lib/api/client'
import type { ShipmentAdapter } from '~/lib/adapters/types'
import {
  mapShipmentToUi,
  mapUiShipmentStatus,
  mapUpdateShipmentToBackend
} from '~/lib/mappers/shipment'
import { isCuidLike, resolveStringIdByNumeric } from '~/lib/mappers/resolve-id'
import type { DeliveryStatus, UpdateShipmentInput } from '~/types'

export function createMoleculerShipmentAdapter(
  getSiteCode: () => string
): ShipmentAdapter {
  const { request } = useApiClient()
  const siteCode = () => getSiteCode()

  async function resolveShipmentId(id: number | string): Promise<string | null> {
    if (isCuidLike(String(id))) return String(id)
    const history = await request<{ items: Array<Record<string, unknown>> }>(
      '/logistics/shipments',
      {}
    )
    return resolveStringIdByNumeric(history.items ?? [], id)
  }

  return {
    async list() {
      const result = await request<{ items: Array<Parameters<typeof mapShipmentToUi>[0]> }>(
        '/logistics/shipments',
        {}
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
        }
      })
      await request(`/logistics/picklists/${encodeURIComponent(picklist.pickList.id)}/complete`, {
        method: 'POST'
      })
      const planned = await request<{ shipment: Parameters<typeof mapShipmentToUi>[0] }>(
        '/logistics/shipments/plan',
        {
          method: 'POST',
          body: { pickListId: picklist.pickList.id, carrier: input.carrier }
        }
      )
      const updated = await request<{ shipment: Parameters<typeof mapShipmentToUi>[0] }>(
        `/logistics/shipments/${encodeURIComponent(planned.shipment.id)}`,
        {
          method: 'PATCH',
          body: {
            clientCode: input.client,
            deliveryAddress: input.address,
            plannedDeliveryDate: input.estimatedDelivery,
            emoji: input.emoji,
            orderNumber: input.orderNumber || orderNumber
          }
        }
      )
      return mapShipmentToUi(updated.shipment)
    },

    async update(id, input: UpdateShipmentInput, backendId?: string) {
      const shipmentId = backendId ?? await resolveShipmentId(id)
      if (!shipmentId) throw new Error('NOT_FOUND')
      const updated = await request<{ shipment: Parameters<typeof mapShipmentToUi>[0] }>(
        `/logistics/shipments/${encodeURIComponent(shipmentId)}`,
        {
          method: 'PATCH',
          body: mapUpdateShipmentToBackend(input)
        }
      )
      return mapShipmentToUi(updated.shipment)
    },

    async remove(id, backendId?: string) {
      const shipmentId = backendId ?? await resolveShipmentId(id)
      if (!shipmentId) throw new Error('NOT_FOUND')
      await request(`/logistics/shipments/${encodeURIComponent(shipmentId)}`, {
        method: 'DELETE'
      })
    },

    async updateStatus(id, status: DeliveryStatus, backendId?: string) {
      const shipmentId = backendId ?? await resolveShipmentId(id)
      if (!shipmentId) throw new Error('NOT_FOUND')
      const updated = await request<{ shipment: Parameters<typeof mapShipmentToUi>[0] }>(
        `/logistics/shipments/${encodeURIComponent(shipmentId)}/status`,
        {
          method: 'PATCH',
          body: { status: mapUiShipmentStatus(status) }
        }
      )
      return mapShipmentToUi(updated.shipment)
    }
  }
}

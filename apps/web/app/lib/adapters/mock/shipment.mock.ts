import { simulateDelay } from '~/lib/api/client'
import { createInitialShipments } from '~/fixtures/shipment/deliveries'
import type { ShipmentAdapter } from '~/lib/adapters/types'
import type { CreateShipmentInput, DeliveryStatus, Shipment } from '~/types'
import { ApiClientError } from '~/lib/api/envelope'

const shipmentsStore: Shipment[] = createInitialShipments()
let nextShipmentId = 4
let nextShipmentNum = 404

export function getMockShipments(): Shipment[] {
  return shipmentsStore
}

export function createMockShipmentAdapter(): ShipmentAdapter {
  return {
    async list() {
      await simulateDelay()
      return [...shipmentsStore]
    },

    async create(input: CreateShipmentInput) {
      await simulateDelay()
      const shipment: Shipment = {
        id: nextShipmentId++,
        shipmentNumber: `EXP-2026-${nextShipmentNum++}`,
        orderNumber: input.orderNumber,
        client: input.client,
        address: input.address,
        carrier: input.carrier,
        status: 'loading',
        departureDate: new Date().toISOString().slice(0, 10),
        estimatedDelivery: input.estimatedDelivery,
        delayDays: 0,
        emoji: input.emoji
      }
      shipmentsStore.unshift(shipment)
      return shipment
    },

    async updateStatus(id: number, status: DeliveryStatus) {
      await simulateDelay()
      const idx = shipmentsStore.findIndex(s => s.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Expédition introuvable')
      shipmentsStore[idx] = { ...shipmentsStore[idx]!, status }
      return shipmentsStore[idx]!
    }
  }
}

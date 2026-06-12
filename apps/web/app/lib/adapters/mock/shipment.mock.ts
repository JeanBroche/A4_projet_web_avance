import { simulateDelay } from '~/lib/api/client'
import { createInitialShipments } from '~/fixtures/shipment/deliveries'
import type { ShipmentAdapter } from '~/lib/adapters/types'
import { mapBackendStatusToUi, mapUiShipmentStatus } from '~/lib/mappers/shipment'
import type { CreateShipmentInput, DeliveryStatus, Shipment, UpdateShipmentInput } from '~/types'
import { ApiClientError } from '~/lib/api/envelope'

const shipmentsStore: Shipment[] = createInitialShipments()
let nextShipmentId = 4
let nextShipmentNum = 404

export function getMockShipments(): Shipment[] {
  return [...shipmentsStore]
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
        status: 'planned',
        backendStatus: 'PLANNED',
        departureDate: new Date().toISOString().slice(0, 10),
        estimatedDelivery: input.estimatedDelivery,
        delayDays: 0,
        emoji: input.emoji
      }
      shipmentsStore.unshift(shipment)
      return shipment
    },

    async update(id: number, input: UpdateShipmentInput, _backendId?: string) {
      await simulateDelay()
      const idx = shipmentsStore.findIndex(s => s.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Expédition introuvable')
      const finalBackend = mapUiShipmentStatus(input.status)
      shipmentsStore[idx] = {
        ...shipmentsStore[idx]!,
        client: input.client,
        orderNumber: input.orderNumber,
        address: input.address,
        carrier: input.carrier,
        departureDate: input.departureDate,
        estimatedDelivery: input.estimatedDelivery,
        emoji: input.emoji,
        backendStatus: finalBackend,
        status: mapBackendStatusToUi(finalBackend)
      }
      return shipmentsStore[idx]!
    },

    async updateStatus(id: number, status: DeliveryStatus, _backendId?: string) {
      await simulateDelay()
      const idx = shipmentsStore.findIndex(s => s.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Expédition introuvable')
      const current = shipmentsStore[idx]!
      if (current.status === status) return current
      const finalBackend = mapUiShipmentStatus(status)
      shipmentsStore[idx] = {
        ...current,
        backendStatus: finalBackend,
        status: mapBackendStatusToUi(finalBackend)
      }
      return shipmentsStore[idx]!
    }
  }
}

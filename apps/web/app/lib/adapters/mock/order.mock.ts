import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity } from '~/lib/adapters/mock/audit-store'
import { getMockActorName } from '~/lib/adapters/mock/mock-actor'
import { createInitialOrders } from '~/fixtures/order/commands'
import type { OrderAdapter } from '~/lib/adapters/types'
import type { CreateOrderInput, Order, OrderPriority, OrderStatus } from '~/types'
import { ApiClientError } from '~/lib/api/envelope'

const ordersStore: Order[] = createInitialOrders()
let nextOrderId = 5
let nextOrderNum = 93

export function getMockOrders(): Order[] {
  return ordersStore
}

export function createMockOrderAdapter(): OrderAdapter {
  return {
    async list() {
      await simulateDelay()
      return [...ordersStore]
    },

    async create(input: CreateOrderInput) {
      await simulateDelay()
      const order: Order = {
        id: nextOrderId++,
        orderNumber: `CMD-2026-${String(nextOrderNum++).padStart(3, '0')}`,
        client: input.client,
        destination: input.destination,
        createdAt: new Date().toISOString().slice(0, 10),
        itemsCount: input.itemsCount,
        weight: `${input.weightValue} kg`,
        carrier: input.carrier,
        status: 'prepared',
        validationStatus: 'pending',
        priority: input.priority ?? 'normal',
        hasAnomaly: false,
        emoji: input.emoji,
        deliveryDate: (() => {
          const d = new Date()
          d.setDate(d.getDate() + 14)
          return d.toISOString().slice(0, 10)
        })()
      }
      ordersStore.unshift(order)
      appendMockActivity({
        type: 'stock_updated',
        title: 'Commande enregistrée',
        description: `Commande ${order.orderNumber} pour ${order.client} — en attente de validation.`,
        user: getMockActorName(),
        meta: order.orderNumber
      })
      return order
    },

    async updateStatus(id: number, status: OrderStatus) {
      await simulateDelay()
      const idx = ordersStore.findIndex(o => o.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Commande introuvable')
      ordersStore[idx] = { ...ordersStore[idx]!, status }
      return ordersStore[idx]!
    },

    async validate(id: number) {
      await simulateDelay()
      const idx = ordersStore.findIndex(o => o.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Commande introuvable')
      ordersStore[idx] = { ...ordersStore[idx]!, validationStatus: 'validated' }
      const order = ordersStore[idx]!
      appendMockActivity({
        type: 'bom_validated',
        title: 'Commande validée',
        description: `Commande ${order.orderNumber} approuvée pour expédition.`,
        user: getMockActorName(),
        meta: order.orderNumber
      })
      return order
    },

    async reject(id: number) {
      await simulateDelay()
      const idx = ordersStore.findIndex(o => o.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Commande introuvable')
      ordersStore[idx] = { ...ordersStore[idx]!, validationStatus: 'rejected' }
      const order = ordersStore[idx]!
      appendMockActivity({
        type: 'anomaly',
        title: 'Commande rejetée',
        description: `Commande ${order.orderNumber} refusée par le commercial.`,
        user: getMockActorName(),
        meta: order.orderNumber
      })
      return order
    },

    async changePriority(id: number, priority: OrderPriority) {
      await simulateDelay()
      const idx = ordersStore.findIndex(o => o.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Commande introuvable')
      ordersStore[idx] = { ...ordersStore[idx]!, priority }
      const order = ordersStore[idx]!
      appendMockActivity({
        type: 'stock_updated',
        title: 'Priorité modifiée',
        description: `Commande ${order.orderNumber} : priorité ${priority}.`,
        user: getMockActorName(),
        meta: order.orderNumber
      })
      return order
    },

    async reportAnomaly(id: number) {
      await simulateDelay()
      const idx = ordersStore.findIndex(o => o.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Commande introuvable')
      ordersStore[idx] = { ...ordersStore[idx]!, hasAnomaly: true }
      const order = ordersStore[idx]!
      appendMockActivity({
        type: 'anomaly',
        title: 'Anomalie commande',
        description: `Anomalie logistique sur ${order.orderNumber}.`,
        user: getMockActorName(),
        meta: order.orderNumber
      })
      return order
    },

    async clearAnomaly(id: number) {
      await simulateDelay()
      const idx = ordersStore.findIndex(o => o.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Commande introuvable')
      ordersStore[idx] = { ...ordersStore[idx]!, hasAnomaly: false }
      return ordersStore[idx]!
    }
  }
}

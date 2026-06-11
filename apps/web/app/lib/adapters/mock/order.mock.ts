import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity } from '~/lib/adapters/mock/audit-store'
import { getMockActorName } from '~/lib/adapters/mock/mock-actor'
import { createInitialOrders } from '~/fixtures/order/commands'
import type { OrderAdapter } from '~/lib/adapters/types'
import type {
  ClientStats,
  CreateOrderInput,
  Order,
  OrderHistoryEntry,
  OrderPriority,
  OrderStatus
} from '~/types'
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

    async getClientStats(client: string) {
      await simulateDelay(80)
      const clientOrders = ordersStore.filter(o => o.client === client)
      if (clientOrders.length === 0) {
        throw new ApiClientError('NOT_FOUND', 'Client introuvable')
      }
      const delivered = clientOrders.filter(o => o.status === 'delivered').length
      const urgent = clientOrders.filter(o => o.priority === 'urgent').length
      const leadDays = clientOrders.map((o) => {
        const created = new Date(o.createdAt).getTime()
        const delivery = new Date(o.deliveryDate).getTime()
        return Math.max(1, Math.round((delivery - created) / 86400000))
      })
      const averageLeadDays = Math.round(
        leadDays.reduce((a, b) => a + b, 0) / leadDays.length
      )
      return {
        client,
        orderCount: clientOrders.length,
        deliveredCount: delivered,
        urgentCount: urgent,
        averageLeadDays,
        totalRevenueEstimate: clientOrders.length * 12500
      } satisfies ClientStats
    },

    async getOrderHistory(orderId: number) {
      await simulateDelay(80)
      const order = ordersStore.find(o => o.id === orderId)
      if (!order) throw new ApiClientError('NOT_FOUND', 'Commande introuvable')

      const history: OrderHistoryEntry[] = [
        {
          at: new Date(order.createdAt),
          label: 'Création',
          description: `Commande ${order.orderNumber} enregistrée`
        }
      ]
      if (order.validationStatus === 'validated') {
        history.push({
          at: new Date(Date.now() - 5 * 86400000),
          label: 'Validation commerciale',
          description: 'Commande approuvée pour production'
        })
      }
      if (order.validationStatus === 'rejected') {
        history.push({
          at: new Date(Date.now() - 5 * 86400000),
          label: 'Rejet',
          description: 'Commande refusée par le commercial'
        })
      }
      if (order.priority === 'urgent') {
        history.push({
          at: new Date(Date.now() - 4 * 86400000),
          label: 'Commande spéciale',
          description: 'Priorité urgente activée'
        })
      }
      if (order.status === 'shipped' || order.status === 'delivered') {
        history.push({
          at: new Date(Date.now() - 2 * 86400000),
          label: 'Expédition',
          description: `Colis confié à ${order.carrier}`
        })
      }
      if (order.status === 'delivered') {
        history.push({
          at: new Date(order.deliveryDate),
          label: 'Livraison',
          description: `Livré à ${order.destination}`
        })
      }
      if (order.hasAnomaly) {
        history.push({
          at: new Date(Date.now() - 86400000),
          label: 'Anomalie',
          description: 'Flux logistique suspendu'
        })
      }
      return history.sort((a, b) => a.at.getTime() - b.at.getTime())
    },

    async getDelayRisk(orderId: number) {
      await simulateDelay(60)
      const order = ordersStore.find(o => o.id === orderId)
      if (!order) return null
      if (order.priority === 'urgent' || order.hasAnomaly) {
        return {
          orderId,
          riskLevel: 'high' as const,
          message: 'Commande urgente ou flux impacté'
        }
      }
      return {
        orderId,
        riskLevel: 'low' as const,
        message: 'Délai dans les normes'
      }
    }
  }
}

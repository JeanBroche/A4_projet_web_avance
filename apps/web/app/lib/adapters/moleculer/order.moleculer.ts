import { useApiClient } from '~/lib/api/client'
import type { OrderAdapter } from '~/lib/adapters/types'
import {
  mapClientStatsToUi,
  mapOrderHistoryToUi,
  mapOrderToUi
} from '~/lib/mappers/order'
import { isCuidLike, resolveStringIdByNumeric } from '~/lib/mappers/resolve-id'
import { toNumericId } from '~/lib/mappers/id'

export function createMoleculerOrderAdapter(
  getSiteCode: () => string
): OrderAdapter {
  const { request } = useApiClient()
  const siteCode = () => getSiteCode()

  async function resolveOrderId(numericOrCuid: number | string): Promise<string | null> {
    if (isCuidLike(String(numericOrCuid))) return String(numericOrCuid)
    const history = await request<{ items?: Array<Record<string, unknown>> }>(
      '/commercial/orders/history',
      { params: { limit: 200, siteCode: siteCode() } }
    )
    return resolveStringIdByNumeric(history.items ?? [], numericOrCuid)
  }

  async function resolveProductCode(): Promise<string> {
    try {
      const codes = import.meta.client
        ? JSON.parse(sessionStorage.getItem('aeronexis-product-codes') ?? '[]') as string[]
        : []
      if (codes[0]) return codes[0]
    } catch {
      // ignore
    }
    return 'PROD-GENERIC'
  }

  return {
    async list() {
      const history = await request<{ items?: Array<Parameters<typeof mapOrderToUi>[0]> }>(
        '/commercial/orders/history',
        { params: { limit: 100, siteCode: siteCode() } }
      )
      const orders = history.items ?? []
      if (orders.length === 0) {
        const urgent = await request<Array<Parameters<typeof mapOrderToUi>[0]>>(
          '/commercial/orders/urgent',
          { params: { siteCode: siteCode() } }
        )
        return (urgent ?? []).map(mapOrderToUi)
      }
      return orders.map(mapOrderToUi)
    },

    async create(input) {
      const clients = await request<Array<Record<string, unknown>>>('/commercial/clients', {
        params: { siteCode: siteCode() }
      })
      let client = clients.find(c => c.name === input.client || c.code === input.client)
      if (!client) {
        client = await request<Record<string, unknown>>('/commercial/clients', {
          method: 'PUT',
          body: {
            code: input.client.toUpperCase().replace(/\s+/g, '-').slice(0, 20),
            name: input.client,
            siteCode: siteCode()
          }
        })
      }
      const productCode = input.productCode ?? await resolveProductCode()
      const order = await request<Parameters<typeof mapOrderToUi>[0]>('/commercial/orders', {
        method: 'POST',
        body: {
          clientId: client.id,
          siteCode: siteCode(),
          isUrgent: input.priority === 'urgent',
          lines: [{
            productCode,
            description: input.destination,
            quantity: input.itemsCount,
            unitPrice: 10000
          }]
        }
      })
      return mapOrderToUi(order)
    },

    async updateStatus(id, status) {
      const orderId = await resolveOrderId(id)
      if (!orderId) throw new Error('NOT_FOUND')
      const order = await request<Parameters<typeof mapOrderToUi>[0]>(
        `/commercial/orders/${encodeURIComponent(orderId)}/logistics-status`,
        {
          method: 'PATCH',
          body: { status }
        }
      )
      return mapOrderToUi(order)
    },

    async validate(id) {
      const orderId = await resolveOrderId(id)
      if (!orderId) throw new Error('NOT_FOUND')
      const order = await request<Parameters<typeof mapOrderToUi>[0]>(
        `/commercial/orders/${encodeURIComponent(orderId)}/validate`,
        { method: 'POST' }
      )
      return mapOrderToUi(order)
    },

    async reject(id) {
      const orderId = await resolveOrderId(id)
      if (!orderId) throw new Error('NOT_FOUND')
      const order = await request<Parameters<typeof mapOrderToUi>[0]>(
        `/commercial/orders/${encodeURIComponent(orderId)}/reject`,
        {
          method: 'POST',
          body: { reason: 'Rejected via UI' }
        }
      )
      return mapOrderToUi(order)
    },

    async changePriority(id, priority) {
      const orderId = await resolveOrderId(id)
      if (!orderId) throw new Error('NOT_FOUND')
      const order = await request<Parameters<typeof mapOrderToUi>[0]>(
        `/commercial/orders/${encodeURIComponent(orderId)}/priority`,
        {
          method: 'PATCH',
          body: { isUrgent: priority === 'urgent' }
        }
      )
      return mapOrderToUi(order)
    },

    async getClientStats(client) {
      const clients = await request<Array<Record<string, unknown>>>('/commercial/clients', {
        params: { siteCode: siteCode() }
      })
      const match = clients.find(c => c.name === client || c.code === client)
      if (!match?.id) throw new Error('NOT_FOUND')
      const stats = await request<Parameters<typeof mapClientStatsToUi>[0]>(
        `/commercial/clients/${encodeURIComponent(String(match.id))}/stats`,
        {}
      )
      return mapClientStatsToUi(stats)
    },

    async getOrderHistory(orderId) {
      const id = await resolveOrderId(orderId)
      if (!id) throw new Error('NOT_FOUND')
      const history = await request<
        Array<Parameters<typeof mapOrderHistoryToUi>[0][number]>
        | { items?: Array<Parameters<typeof mapOrderHistoryToUi>[0][number]> }
      >(
        `/commercial/orders/${encodeURIComponent(id)}/status`,
        {}
      )
      const entries = Array.isArray(history) ? history : (history.items ?? [])
      return mapOrderHistoryToUi(entries)
    },

    async getDelayRisk(orderId) {
      const id = await resolveOrderId(orderId)
      if (!id) return null
      try {
        const risk = await request<{
          riskLevel?: string
          level?: string
          message?: string
          score?: number
        }>(
          `/commercial/orders/${encodeURIComponent(id)}/delay-risk`,
          {}
        )
        const level = (risk.riskLevel ?? risk.level ?? 'low').toLowerCase()
        const riskLevel = level === 'high' || level === 'critical'
          ? 'high'
          : level === 'medium' || level === 'warning'
            ? 'medium'
            : 'low'
        return {
          orderId: toNumericId(id),
          riskLevel,
          message: risk.message ?? 'Analyse du risque de retard'
        }
      } catch {
        return null
      }
    }
  }
}

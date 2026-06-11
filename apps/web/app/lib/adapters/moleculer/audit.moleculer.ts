import { useApiClient } from '~/lib/api/client'
import type { AuditAdapter } from '~/lib/adapters/types'
import { mapAuditChangeToActivity, mapLotTraceToUi } from '~/lib/mappers/audit'

export function createMoleculerAuditAdapter(): AuditAdapter {
  const { request } = useApiClient()

  return {
    async listActivities() {
      try {
        const result = await request<{ items?: Array<Parameters<typeof mapAuditChangeToActivity>[0]> } | Array<Parameters<typeof mapAuditChangeToActivity>[0]>>(
          '/audit/changes',
          {}
        )
        const items = Array.isArray(result) ? result : (result.items ?? [])
        return items.map((item, index) => mapAuditChangeToActivity(item, index))
      } catch {
        const critical = await this.listCriticalEvents()
        return critical
      }
    },

    async listCriticalEvents() {
      const result = await request<{ items?: Array<{
        id?: string
        type?: string
        message?: string
        severity?: string
        createdAt?: string
      }> } | Array<{
        id?: string
        type?: string
        message?: string
        severity?: string
        createdAt?: string
      }>>(
        '/audit/events/critical',
        {}
      )
      const items = Array.isArray(result) ? result : (result.items ?? [])
      return items.map((item, index) => ({
        id: index + 1,
        type: 'anomaly' as const,
        title: item.type ?? 'Incident critique',
        description: item.message ?? '—',
        user: 'Système',
        date: item.createdAt ? new Date(item.createdAt) : new Date(),
        meta: item.severity
      }))
    },

    async append(input) {
      await request('/audit/events', {
        method: 'POST',
        body: {
          severity: 'WARNING',
          type: input.type,
          message: `${input.title}: ${input.description}`,
          metadata: { user: input.user, meta: input.meta }
        }
      })
      return {
        id: Date.now(),
        type: input.type,
        title: input.title,
        description: input.description,
        user: input.user,
        userId: input.userId,
        date: new Date(),
        meta: input.meta
      }
    },

    async traceLot(lotNumber) {
      const trace = await request<Parameters<typeof mapLotTraceToUi>[0]>(
        `/audit/lots/${encodeURIComponent(lotNumber)}/trace`,
        {}
      )
      return mapLotTraceToUi(trace)
    },

    async exportLot(lotNumber) {
      const result = await request<{ content?: string, format?: string } | string>(
        `/audit/lots/${encodeURIComponent(lotNumber)}/export`,
        {}
      )
      if (typeof result === 'string') return result
      return result.content ?? JSON.stringify(result, null, 2)
    }
  }
}

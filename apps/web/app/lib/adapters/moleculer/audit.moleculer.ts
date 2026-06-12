import { useApiClient } from '~/lib/api/client'
import type { AuditAdapter } from '~/lib/adapters/types'
import type { LotDocument } from '~/types'
import { mapAuditChangeToActivity, mapLotTraceToUi } from '~/lib/mappers/audit'

export function createMoleculerAuditAdapter(): AuditAdapter {
  const { request } = useApiClient()

  return {
    async listActivities() {
      const result = await request<{ items?: Array<Parameters<typeof mapAuditChangeToActivity>[0]> } | Array<Parameters<typeof mapAuditChangeToActivity>[0]>>(
        '/audit/changes',
        { params: { limit: 100 } }
      )
      const items = Array.isArray(result) ? result : (result.items ?? [])
      return items.map((item, index) => mapAuditChangeToActivity(item, index))
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
    },

    async uploadLotDocument(lotId, file) {
      const result = await request<LotDocument>('/audit/documents', {
        method: 'POST',
        body: {
          lotId,
          filename: file.filename,
          contentType: file.contentType,
          contentBase64: file.contentBase64
        }
      })
      return result
    },

    async listLotDocuments(lotId) {
      const result = await request<{ items?: LotDocument[] }>(
        '/audit/documents',
        { params: { lotId } }
      )
      return result.items ?? []
    },

    async getLotDocumentUrl(documentId) {
      const result = await request<{ url?: string }>(
        `/audit/documents/${encodeURIComponent(documentId)}/url`,
        {}
      )
      if (!result.url) throw new Error('URL indisponible')
      return result.url
    },

    async downloadLotDocument(documentId) {
      const result = await request<{
        filename?: string
        contentType?: string
        contentBase64?: string
        sizeBytes?: number
      }>(`/audit/documents/${encodeURIComponent(documentId)}/download`, {})
      if (!result.contentBase64) throw new Error('Document indisponible')
      return {
        filename: result.filename ?? 'document',
        contentType: result.contentType ?? 'application/octet-stream',
        contentBase64: result.contentBase64,
        sizeBytes: result.sizeBytes ?? 0
      }
    }
  }
}

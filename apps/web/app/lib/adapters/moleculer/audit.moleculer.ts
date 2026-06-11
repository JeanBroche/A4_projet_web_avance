/**
 * Adapter Moleculer — Audit
 * Routes gateway prévues :
 *   GET  /api/audit/changes   → audit.change.list
 *   POST /api/audit/events    → audit.event.log (append)
 */
import { useApiClient } from '~/lib/api/client'
import type { AuditAdapter } from '~/lib/adapters/types'

export function createMoleculerAuditAdapter(getToken: () => string | null): AuditAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    listActivities() {
      return request('/audit/changes', { accessToken: token() })
    },
    append(input) {
      return request('/audit/events', { method: 'POST', body: input, accessToken: token() })
    },
    traceLot(lotNumber) {
      return request(`/audit/lots/${encodeURIComponent(lotNumber)}/trace`, { accessToken: token() })
    }
  }
}

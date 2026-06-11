/**
 * Adapter Moleculer — Audit
 * Routes gateway prévues :
 *   GET  /api/v1/audit/changes   → audit.change.list
 *   POST /api/v1/audit/events    → audit.event.log (append)
 */
import { useApiClient } from '~/lib/api/client'
import type { AuditAdapter } from '~/lib/adapters/types'

export function createMoleculerAuditAdapter(getToken: () => string | null): AuditAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    listActivities() {
      return request('/v1/audit/changes', { accessToken: token() })
    },
    append(input) {
      return request('/v1/audit/events', { method: 'POST', body: input, accessToken: token() })
    }
  }
}

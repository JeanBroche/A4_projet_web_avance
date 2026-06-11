import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity, getMockActivities } from '~/lib/adapters/mock/audit-store'
import type { AuditAdapter } from '~/lib/adapters/types'

export function createMockAuditAdapter(): AuditAdapter {
  return {
    async listActivities() {
      await simulateDelay()
      return getMockActivities().map(a => ({ ...a, date: new Date(a.date) }))
    },

    async append(input) {
      await simulateDelay(100)
      return appendMockActivity(input)
    }
  }
}

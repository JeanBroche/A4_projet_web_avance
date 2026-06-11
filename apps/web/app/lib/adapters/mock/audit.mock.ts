import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity, getMockActivities } from '~/lib/adapters/mock/audit-store'
import { buildMockLotTrace } from '~/lib/adapters/mock/lot-trace'
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
    },

    async traceLot(lotNumber) {
      await simulateDelay(120)
      return buildMockLotTrace(lotNumber)
    },

    async listCriticalEvents() {
      await simulateDelay(80)
      return getMockActivities()
        .filter(a => a.type === 'anomaly')
        .map((a, index) => ({ ...a, id: index + 1, date: new Date(a.date) }))
    },

    async exportLot(lotNumber) {
      await simulateDelay(100)
      const trace = buildMockLotTrace(lotNumber)
      return JSON.stringify(trace, null, 2)
    }
  }
}

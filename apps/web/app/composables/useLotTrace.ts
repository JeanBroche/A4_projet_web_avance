import { toFailureResult } from '~/lib/api/envelope'
import { mapBatchHistoryToTraceEvents } from '~/lib/mappers/audit'
import type { AsyncStatus, LotTraceEvent, LotTraceTimeline } from '~/types'

export function useLotTrace() {
  const adapters = useAdapters()

  const timeline = ref<LotTraceTimeline | null>(null)
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)

  async function trace(lotNumber: string) {
    status.value = 'pending'
    error.value = null
    timeline.value = null
    try {
      const [historyResult, auditResult] = await Promise.allSettled([
        adapters.production.listBatchHistory(lotNumber),
        adapters.audit.traceLot(lotNumber)
      ])

      const productionEvents: LotTraceEvent[] =
        historyResult.status === 'fulfilled'
          ? mapBatchHistoryToTraceEvents(historyResult.value)
          : []

      const auditTimeline =
        auditResult.status === 'fulfilled' ? auditResult.value : null

      const auditEvents = (auditTimeline?.events ?? []).filter(
        (event) => event.source !== 'production'
      )

      const merged = [...productionEvents, ...auditEvents].sort(
        (a, b) => b.at.getTime() - a.at.getTime()
      )

      timeline.value = {
        lotId: auditTimeline?.lotId ?? lotNumber,
        lotNumber: auditTimeline?.lotNumber ?? lotNumber,
        ofNumber: auditTimeline?.ofNumber ?? '—',
        productName: auditTimeline?.productName ?? '—',
        events: merged
      }

      if (merged.length === 0 && historyResult.status === 'rejected' && auditResult.status === 'rejected') {
        const failure = toFailureResult(historyResult.reason ?? auditResult.reason)
        status.value = 'failure'
        error.value = failure.message
        return
      }

      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  function reset() {
    timeline.value = null
    status.value = 'idle'
    error.value = null
  }

  return { timeline, status, error, trace, reset }
}

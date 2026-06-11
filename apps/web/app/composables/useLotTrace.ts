import { toFailureResult } from '~/lib/api/envelope'
import type { AsyncStatus, LotTraceTimeline } from '~/types'

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
      timeline.value = await adapters.audit.traceLot(lotNumber)
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

  async function exportTrace(lotNumber: string) {
    const content = await adapters.audit.exportLot(lotNumber)
    if (!import.meta.client) return
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `trace-${lotNumber}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return { timeline, status, error, trace, reset, exportTrace }
}

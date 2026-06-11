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

  return { timeline, status, error, trace, reset }
}

import { toFailureResult } from '~/lib/api/envelope'
import type { AsyncStatus, KpiDashboard } from '~/types'

export function useReporting() {
  const adapters = useAdapters()

  const dashboard = ref<KpiDashboard | null>(null)
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)

  async function refresh() {
    status.value = 'pending'
    error.value = null
    try {
      dashboard.value = await adapters.reporting.getDashboard()
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  return { dashboard, status, error, refresh }
}

import { toFailureResult } from '~/lib/api/envelope'
import {
  dashboardSiteLabel,
  defaultDashboardSiteScope,
  reportingSiteCode,
  type DashboardSiteScope
} from '~/lib/sites'
import type { AsyncStatus, KpiDashboard } from '~/types'

export function useReporting() {
  const adapters = useAdapters()
  const { user, role } = useSession()

  const selectedSiteScope = useState<DashboardSiteScope | null>('reporting:siteScope', () => null)
  const dashboard = ref<KpiDashboard | null>(null)
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)

  function resolveScope(): DashboardSiteScope {
    if (selectedSiteScope.value) return selectedSiteScope.value
    return defaultDashboardSiteScope(role.value, user.value?.siteCode)
  }

  async function refresh() {
    const scope = resolveScope()
    if (!selectedSiteScope.value) {
      selectedSiteScope.value = scope
    }

    status.value = 'pending'
    error.value = null
    try {
      const consolidated = scope === 'ALL'
      dashboard.value = await adapters.reporting.getDashboard({
        consolidated,
        siteCode: reportingSiteCode(scope)
      })
      if (dashboard.value) {
        dashboard.value.siteLabel = dashboardSiteLabel(scope)
      }
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  async function setSiteScope(scope: DashboardSiteScope) {
    selectedSiteScope.value = scope
    await refresh()
  }

  return {
    dashboard,
    status,
    error,
    selectedSiteScope: computed(() => selectedSiteScope.value ?? resolveScope()),
    refresh,
    setSiteScope
  }
}

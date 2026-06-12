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
      const [kpiDashboard, criticalEvents] = await Promise.all([
        adapters.reporting.getDashboard({
          consolidated,
          siteCode: reportingSiteCode(scope)
        }),
        adapters.audit.listCriticalEvents().catch(() => [])
      ])
      dashboard.value = kpiDashboard
      if (dashboard.value) {
        dashboard.value.siteLabel = dashboardSiteLabel(scope)
        const auditIncidents = criticalEvents.map(ev => ({
          id: `audit-${ev.id}`,
          label: ev.title,
          detail: ev.description,
          severity: 'error' as const,
          category: 'audit' as const,
          targetRoute: '/activity'
        }))
        const merged = [...dashboard.value.criticalIncidents, ...auditIncidents]
        const seen = new Set<string>()
        dashboard.value.criticalIncidents = merged.filter((inc) => {
          if (seen.has(inc.id)) return false
          seen.add(inc.id)
          return true
        }).slice(0, 8)
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

import { useApiClient } from '~/lib/api/client'
import type { ReportingAdapter } from '~/lib/adapters/types'
import { mapCalculResponsesToDashboard } from '~/lib/mappers/reporting'
import type { ReportingDashboardOptions } from '~/types'

export function createMoleculerReportingAdapter(getToken: () => string | null): ReportingAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  function kpiParams(options?: ReportingDashboardOptions) {
    if (options?.consolidated) return {}
    if (options?.siteCode) return { siteCode: options.siteCode }
    return {}
  }

  return {
    async getDashboard(options) {
      const params = kpiParams(options)
      const auth = { accessToken: token(), params }
      const [
        rupture,
        rotation,
        urgentOrders,
        delayRisk,
        margin,
        totalDelay,
        avancement,
        retardLots
      ] = await Promise.all([
        request<Record<string, unknown>>('/reporting/kpis/logistique/rupture', auth),
        request<Record<string, unknown>>('/reporting/kpis/logistique/rotation', auth),
        request<Record<string, unknown>>('/reporting/kpis/commercial/urgent-orders', auth),
        request<Record<string, unknown>>('/reporting/kpis/commercial/delay-risk', auth),
        request<Record<string, unknown>>('/reporting/kpis/finance/margin', auth),
        request<Record<string, unknown>>('/reporting/kpis/finance/total-delay', auth),
        request<Record<string, unknown>>('/reporting/kpis/production/avancement', auth),
        request<Record<string, unknown>>('/reporting/kpis/production/retard-lots', auth)
      ])
      return mapCalculResponsesToDashboard({
        rupture,
        rotation,
        urgentOrders,
        delayRisk,
        margin,
        totalDelay,
        avancement,
        retardLots
      })
    }
  }
}

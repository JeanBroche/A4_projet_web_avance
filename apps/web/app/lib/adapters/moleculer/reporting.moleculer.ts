import { useApiClient } from '~/lib/api/client'
import type { ReportingAdapter } from '~/lib/adapters/types'
import {
  mapCalculResponsesToDashboard,
  mergeCalculResponses,
  type KpiCalculResponses
} from '~/lib/mappers/reporting'
import type { ReportingDashboardOptions } from '~/types'

export function createMoleculerReportingAdapter(): ReportingAdapter {
  const { request } = useApiClient()

  async function fetchKpiResponses(siteCode?: string): Promise<KpiCalculResponses> {
    const params = siteCode ? { siteCode } : {}
    const auth = { params }
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
    return { rupture, rotation, urgentOrders, delayRisk, margin, totalDelay, avancement, retardLots }
  }

  return {
    async getDashboard(options) {
      if (options?.consolidated) {
        const [lyo, par] = await Promise.all([
          fetchKpiResponses('SITE-LYO'),
          fetchKpiResponses('SITE-PAR')
        ])
        return mapCalculResponsesToDashboard(mergeCalculResponses(lyo, par))
      }
      return mapCalculResponsesToDashboard(
        await fetchKpiResponses(options?.siteCode)
      )
    }
  }
}

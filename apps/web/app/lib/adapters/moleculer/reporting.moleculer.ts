/**
 * Adapter Moleculer — Reporting
 * Routes gateway prévues :
 *   GET /api/reporting/kpis    → reporting.calcul.*
 *   GET /api/reporting/margins → reporting.calcul.finance.margin
 */
import { useApiClient } from '~/lib/api/client'
import type { ReportingAdapter } from '~/lib/adapters/types'

export function createMoleculerReportingAdapter(getToken: () => string | null): ReportingAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    getDashboard(options) {
      return request('/reporting/kpis', {
        accessToken: token(),
        params: {
          consolidated: options?.consolidated,
          siteCode: options?.siteCode
        }
      })
    }
  }
}

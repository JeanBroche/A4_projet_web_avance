/**
 * Adapter Moleculer — Reporting
 * Routes gateway prévues :
 *   GET /api/v1/reporting/kpis    → reporting.calcul.*
 *   GET /api/v1/reporting/margins → reporting.calcul.finance.margin
 */
import { useApiClient } from '~/lib/api/client'
import type { ReportingAdapter } from '~/lib/adapters/types'

export function createMoleculerReportingAdapter(getToken: () => string | null): ReportingAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    getDashboard() {
      return request('/v1/reporting/kpis', { accessToken: token() })
    }
  }
}

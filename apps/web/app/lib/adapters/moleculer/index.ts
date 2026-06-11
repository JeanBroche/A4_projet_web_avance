import type { Adapters } from '~/lib/adapters/types'
import { createMoleculerAuthAdapter } from './auth.moleculer'
import { createMoleculerStockAdapter } from './stock.moleculer'
import { createMoleculerProductionAdapter } from './production.moleculer'
import { createMoleculerOrderAdapter } from './order.moleculer'
import { createMoleculerShipmentAdapter } from './shipment.moleculer'
import { createMoleculerAuditAdapter } from './audit.moleculer'
import { createMoleculerReportingAdapter } from './reporting.moleculer'
import { createMoleculerNotificationAdapter } from './notification.moleculer'

export function createMoleculerAdapters(
  getToken: () => string | null,
  getSiteCode: () => string
): Adapters {
  return {
    auth: createMoleculerAuthAdapter(),
    stock: createMoleculerStockAdapter(getToken, getSiteCode),
    production: createMoleculerProductionAdapter(getToken, getSiteCode),
    order: createMoleculerOrderAdapter(getToken, getSiteCode),
    shipment: createMoleculerShipmentAdapter(getToken, getSiteCode),
    audit: createMoleculerAuditAdapter(getToken),
    reporting: createMoleculerReportingAdapter(getToken),
    notification: createMoleculerNotificationAdapter(getToken)
  }
}

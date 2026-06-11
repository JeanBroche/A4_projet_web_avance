import type { Adapters } from '~/lib/adapters/types'
import { createMoleculerAuthAdapter } from './auth.moleculer'
import { createMoleculerStockAdapter } from './stock.moleculer'
import { createMoleculerProductionAdapter } from './production.moleculer'
import { createMoleculerOrderAdapter } from './order.moleculer'
import { createMoleculerShipmentAdapter } from './shipment.moleculer'
import { createMoleculerAuditAdapter } from './audit.moleculer'
import { createMoleculerReportingAdapter } from './reporting.moleculer'
import { createMoleculerNotificationAdapter } from './notification.moleculer'

export function createMoleculerAdapters(getSiteCode: () => string): Adapters {
  return {
    auth: createMoleculerAuthAdapter(),
    stock: createMoleculerStockAdapter(getSiteCode),
    production: createMoleculerProductionAdapter(getSiteCode),
    order: createMoleculerOrderAdapter(getSiteCode),
    shipment: createMoleculerShipmentAdapter(getSiteCode),
    audit: createMoleculerAuditAdapter(),
    reporting: createMoleculerReportingAdapter(),
    notification: createMoleculerNotificationAdapter()
  }
}

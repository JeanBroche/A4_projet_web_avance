import type { Adapters } from '~/lib/adapters/types'
import { createMoleculerAuthAdapter } from './auth.moleculer'
import { createMoleculerStockAdapter } from './stock.moleculer'
import { createMoleculerProductionAdapter } from './production.moleculer'
import { createMoleculerOrderAdapter } from './order.moleculer'
import { createMoleculerShipmentAdapter } from './shipment.moleculer'
import { createMoleculerAuditAdapter } from './audit.moleculer'
import { createMoleculerReportingAdapter } from './reporting.moleculer'

export function createMoleculerAdapters(getToken: () => string | null): Adapters {
  return {
    auth: createMoleculerAuthAdapter(),
    stock: createMoleculerStockAdapter(getToken),
    production: createMoleculerProductionAdapter(getToken),
    order: createMoleculerOrderAdapter(getToken),
    shipment: createMoleculerShipmentAdapter(getToken),
    audit: createMoleculerAuditAdapter(getToken),
    reporting: createMoleculerReportingAdapter(getToken)
  }
}

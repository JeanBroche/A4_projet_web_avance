import type { Adapters } from '~/lib/adapters/types'
import { createMockAuthAdapter } from './auth.mock'
import { createMockStockAdapter } from './stock.mock'
import { createMockProductionAdapter } from './production.mock'
import { createMockOrderAdapter } from './order.mock'
import { createMockShipmentAdapter } from './shipment.mock'
import { createMockAuditAdapter } from './audit.mock'
import { createMockReportingAdapter } from './reporting.mock'

export function createMockAdapters(): Adapters {
  return {
    auth: createMockAuthAdapter(),
    stock: createMockStockAdapter(),
    production: createMockProductionAdapter(),
    order: createMockOrderAdapter(),
    shipment: createMockShipmentAdapter(),
    audit: createMockAuditAdapter(),
    reporting: createMockReportingAdapter()
  }
}

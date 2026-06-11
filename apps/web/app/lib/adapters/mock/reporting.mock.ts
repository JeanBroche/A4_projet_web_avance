import { simulateDelay } from '~/lib/api/client'
import { computeKpiDashboard, createInitialMarginOrders } from '~/fixtures/reporting/dashboard'
import { getMockBatches, getMockBomOrders } from '~/lib/adapters/mock/production.mock'
import { getMockOrders } from '~/lib/adapters/mock/order.mock'
import { getMockShipments } from '~/lib/adapters/mock/shipment.mock'
import { getMockStockLevels } from '~/lib/adapters/mock/stock.mock'
import type { ReportingAdapter } from '~/lib/adapters/types'
import type { CriticalIncident } from '~/types'

function computeLiveMetrics() {
  const batches = getMockBatches()
  const bomAnomalies =
    getMockBomOrders().filter(o => o.hasBomAnomaly).length
    + batches.filter(b => b.hasAnomaly).length

  const delayedShipments = getMockShipments().filter(
    s => s.status === 'delayed' || s.delayDays > 0
  ).length
  const blockedOrders = getMockOrders().filter(o => o.hasAnomaly).length
  const lowStock = getMockStockLevels().filter(p => p.available > 0 && p.available < p.minQty).length
  const outOfStock = getMockStockLevels().filter(p => p.available === 0).length

  const yieldRate = batches.length > 0
    ? Math.round((batches.filter(b => b.status === 'validated').length / batches.length) * 100)
    : 0

  const criticalIncidents: CriticalIncident[] = []

  for (const p of getMockStockLevels().filter(x => x.available === 0)) {
    criticalIncidents.push({
      id: `stock-${p.reference}`,
      label: 'Rupture stock',
      detail: `${p.name} (${p.reference})`,
      severity: 'error'
    })
  }
  for (const s of getMockShipments().filter(x => x.status === 'delayed')) {
    criticalIncidents.push({
      id: `ship-${s.id}`,
      label: 'Expédition en retard',
      detail: `${s.shipmentNumber} — ${s.client}`,
      severity: 'error'
    })
  }
  for (const b of batches.filter(x => x.hasAnomaly)) {
    criticalIncidents.push({
      id: `batch-${b.id}`,
      label: 'Incident lot',
      detail: `${b.lotNumber} — ${b.productName}`,
      severity: 'warning'
    })
  }

  return {
    bomAnomalies,
    delayedOrders: delayedShipments + blockedOrders + lowStock + outOfStock,
    yieldRate,
    criticalIncidents: criticalIncidents.slice(0, 8)
  }
}

export function createMockReportingAdapter(): ReportingAdapter {
  return {
    async getDashboard() {
      await simulateDelay()
      return computeKpiDashboard(createInitialMarginOrders(), computeLiveMetrics())
    }
  }
}

import { simulateDelay } from '~/lib/api/client'
import {
  computeKpiDashboard,
  createConsolidatedMarginOrders,
  createSiteMarginOrders
} from '~/fixtures/reporting/dashboard'
import type { ReportingDashboardOptions } from '~/types'
import { getMockBatches } from '~/lib/adapters/mock/production.mock'
import { getMockOrders } from '~/lib/adapters/mock/order.mock'
import { getMockShipments } from '~/lib/adapters/mock/shipment.mock'
import { getMockStockLevels } from '~/lib/adapters/mock/stock.mock'
import type { ReportingAdapter } from '~/lib/adapters/types'
import type { CriticalIncident } from '~/types'

function computeLiveMetrics() {
  const batches = getMockBatches()
  const activeBatches = batches.filter(b => b.status !== 'validated' && b.status !== 'cancelled')
  const completedBatches = batches.filter(b => b.status === 'validated')
  const yieldRate = batches.length > 0
    ? Math.round((completedBatches.length / batches.length) * 100)
    : 0
  const averageProgress = activeBatches.length > 0
    ? Math.round(activeBatches.reduce((sum, b) => sum + b.progress, 0) / activeBatches.length)
    : 0
  const lateBatches = batches.filter(b => b.hasAnomaly).length

  const stockLevels = getMockStockLevels()
  const stockRuptures = stockLevels.filter(p => p.available === 0).length
  const atRiskMaterials = stockLevels
    .filter(p => p.available > 0 && p.available < p.minQty)
    .slice(0, 5)
    .map(p => ({
      code: p.reference,
      score: Math.round(70 + ((p.minQty - p.available) / p.minQty) * 30),
      estimatedDaysToRupture: Math.max(1, Math.round(p.available / 2))
    }))

  const orders = getMockOrders()
  const urgentOrders = orders.filter(o => o.priority === 'urgent').length
  const delayRiskOrders = orders.filter(o => o.hasAnomaly || o.priority === 'urgent').length

  const delayedShipments = getMockShipments().filter(
    s => s.status === 'delayed' || s.delayDays > 0
  )
  const estimatedDelayCost = (delayedShipments.length * 5000).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  })

  const criticalIncidents: CriticalIncident[] = []

  for (const p of stockLevels.filter(x => x.available === 0)) {
    criticalIncidents.push({
      id: `stock-${p.reference}`,
      label: 'Rupture stock',
      detail: `${p.name} (${p.reference})`,
      severity: 'error',
      category: 'stock',
      targetRoute: '/inventaire/spare',
      targetQuery: { ref: p.reference }
    })
  }
  for (const s of delayedShipments) {
    criticalIncidents.push({
      id: `ship-${s.id}`,
      label: 'Expédition en retard',
      detail: `${s.shipmentNumber} — ${s.client}`,
      severity: 'error',
      category: 'production',
      targetRoute: '/delivery',
      targetQuery: { id: String(s.id) }
    })
  }
  for (const b of batches.filter(x => x.hasAnomaly)) {
    criticalIncidents.push({
      id: `batch-${b.id}`,
      label: 'Incident lot',
      detail: `${b.lotNumber} — ${b.productName} (OF ${b.ofNumber})`,
      severity: 'warning',
      category: 'production',
      targetRoute: '/batch',
      targetQuery: { id: String(b.id) }
    })
  }

  return {
    yieldRate,
    averageProgress,
    activeBatches: activeBatches.length,
    lateBatches,
    stockRuptures,
    atRiskMaterials,
    averageConsumptionPerDay: 4.2,
    urgentOrders,
    delayRiskOrders,
    estimatedDelayCost,
    criticalIncidents: criticalIncidents.slice(0, 8)
  }
}

export function createMockReportingAdapter(): ReportingAdapter {
  return {
    async getDashboard(options?: ReportingDashboardOptions) {
      await simulateDelay()
      const consolidated = options?.consolidated ?? false
      const siteCode = options?.siteCode ?? 'SITE-LYO'
      const effectiveSite = siteCode === 'SITE-HQ' ? 'SITE-LYO' : siteCode
      const margins = consolidated
        ? createConsolidatedMarginOrders()
        : createSiteMarginOrders(effectiveSite)
      const metrics = computeLiveMetrics()
      const dashboard = computeKpiDashboard(margins, metrics)
      if (consolidated) {
        return {
          ...dashboard,
          urgentOrders: metrics.urgentOrders + 1,
          stockRuptures: metrics.stockRuptures + 1
        }
      }
      return dashboard
    }
  }
}

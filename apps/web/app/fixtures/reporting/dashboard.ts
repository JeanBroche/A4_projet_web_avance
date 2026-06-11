import type { CriticalIncident, KpiDashboard, MarginData } from '~/types'

export function createInitialMarginOrders(): MarginData[] {
  return [
    { id: 1, ofNumber: 'OF-2026-0142', client: 'Airbus', product: 'Bras articulé A320', costPrice: 4200, sellingPrice: 6500, marginPercent: 35.3 },
    { id: 2, ofNumber: 'OF-2026-0143', client: 'Boeing', product: 'Support moteur B737', costPrice: 8900, sellingPrice: 12000, marginPercent: 25.8 },
    { id: 3, ofNumber: 'OF-2026-0139', client: 'ATR', product: 'Verrouillage train ATR', costPrice: 1500, sellingPrice: 3100, marginPercent: 51.6 },
    { id: 4, ofNumber: 'OF-2026-0145', client: 'Lockheed', product: 'Panneau cockpit C130', costPrice: 14200, sellingPrice: 16000, marginPercent: 11.2 }
  ]
}

export interface KpiLiveMetrics {
  delayedOrders: number
  bomAnomalies: number
  yieldRate: number
  criticalIncidents: CriticalIncident[]
}

export function computeKpiDashboard(marginOrders: MarginData[], metrics: KpiLiveMetrics): KpiDashboard {
  const totalRevenue = marginOrders.reduce((acc, o) => acc + o.sellingPrice, 0)
  const totalCost = marginOrders.reduce((acc, o) => acc + o.costPrice, 0)
  const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

  return {
    globalMargin: avgMargin.toFixed(1),
    delayedOrders: metrics.delayedOrders,
    bomAnomalies: metrics.bomAnomalies,
    totalValue: totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
    yieldRate: metrics.yieldRate,
    marginOrders,
    criticalIncidents: metrics.criticalIncidents
  }
}

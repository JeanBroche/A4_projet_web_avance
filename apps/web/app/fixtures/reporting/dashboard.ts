import type { AtRiskMaterial, CriticalIncident, KpiDashboard, MarginData } from '~/types'

export function createInitialMarginOrders(): MarginData[] {
  return createSiteMarginOrders('SITE-LYO')
}

export function createSiteMarginOrders(siteCode: string): MarginData[] {
  if (siteCode === 'SITE-PAR') {
    return [
      { id: 11, ofNumber: 'OF-2026-0150', client: 'Safran', product: 'Palier turbine LEAP', costPrice: 5200, sellingPrice: 7800, marginPercent: 33.3 },
      { id: 12, ofNumber: 'OF-2026-0151', client: 'Dassault', product: 'Trappe accès Rafale', costPrice: 3100, sellingPrice: 4900, marginPercent: 36.7 }
    ]
  }
  return [
    { id: 1, ofNumber: 'OF-2026-0142', client: 'Airbus', product: 'Bras articulé A320', costPrice: 4200, sellingPrice: 6500, marginPercent: 35.3 },
    { id: 2, ofNumber: 'OF-2026-0143', client: 'Boeing', product: 'Support moteur B737', costPrice: 8900, sellingPrice: 12000, marginPercent: 25.8 },
    { id: 3, ofNumber: 'OF-2026-0139', client: 'ATR', product: 'Verrouillage train ATR', costPrice: 1500, sellingPrice: 3100, marginPercent: 51.6 },
    { id: 4, ofNumber: 'OF-2026-0145', client: 'Lockheed', product: 'Panneau cockpit C130', costPrice: 14200, sellingPrice: 16000, marginPercent: 11.2 }
  ]
}

export function createConsolidatedMarginOrders(): MarginData[] {
  return [...createSiteMarginOrders('SITE-LYO'), ...createSiteMarginOrders('SITE-PAR')]
}

export interface KpiLiveMetrics {
  yieldRate: number
  averageProgress: number
  activeBatches: number
  lateBatches: number
  stockRuptures: number
  atRiskMaterials: AtRiskMaterial[]
  averageConsumptionPerDay: number
  urgentOrders: number
  delayRiskOrders: number
  estimatedDelayCost: string
  criticalIncidents: CriticalIncident[]
}

export function computeKpiDashboard(marginOrders: MarginData[], metrics: KpiLiveMetrics): KpiDashboard {
  const totalRevenue = marginOrders.reduce((acc, o) => acc + o.sellingPrice, 0)
  const totalCost = marginOrders.reduce((acc, o) => acc + o.costPrice, 0)
  const avgMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

  return {
    globalMargin: avgMargin.toFixed(1),
    totalValue: totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
    estimatedDelayCost: metrics.estimatedDelayCost,
    marginOrders,

    yieldRate: metrics.yieldRate,
    averageProgress: metrics.averageProgress,
    activeBatches: metrics.activeBatches,
    lateBatches: metrics.lateBatches,

    stockRuptures: metrics.stockRuptures,
    atRiskMaterials: metrics.atRiskMaterials,
    averageConsumptionPerDay: metrics.averageConsumptionPerDay,

    urgentOrders: metrics.urgentOrders,
    delayRiskOrders: metrics.delayRiskOrders,

    criticalIncidents: metrics.criticalIncidents
  }
}

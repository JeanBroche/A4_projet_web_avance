import type { AtRiskMaterial, CriticalIncident, KpiDashboard } from '~/types'

export type KpiCalculResponses = {
  rupture: Record<string, unknown>
  rotation: Record<string, unknown>
  urgentOrders: Record<string, unknown>
  delayRisk: Record<string, unknown>
  margin: Record<string, unknown>
  totalDelay: Record<string, unknown>
  avancement: Record<string, unknown>
  retardLots: Record<string, unknown>
}

function formatCurrency(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

function mapAtRiskMaterials(rotation: Record<string, unknown>): AtRiskMaterial[] {
  const rows = (rotation.atRiskMaterials as Array<Record<string, unknown>> | undefined) ?? []
  return rows.map((m) => ({
    code: String(m.code ?? '—'),
    siteCode: m.siteCode ? String(m.siteCode) : undefined,
    score: Number(m.score ?? 0),
    estimatedDaysToRupture: m.estimatedDaysToRupture == null
      ? null
      : Number(m.estimatedDaysToRupture)
  }))
}

function mapMarginOrders(margin: Record<string, unknown>): KpiDashboard['marginOrders'] {
  if (!Array.isArray(margin.orders)) return []
  return (margin.orders as Array<Record<string, unknown>>).map((o, index) => ({
    id: index + 1,
    ofNumber: String(o.ofNumber ?? o.orderNumber ?? `OF-${index + 1}`),
    client: String(o.clientName ?? o.client ?? '—'),
    product: String(o.productCode ?? o.product ?? '—'),
    costPrice: Number(o.estimatedCost ?? o.costPrice ?? 0),
    sellingPrice: Number(o.totalAmount ?? o.sellingPrice ?? 0),
    marginPercent: Number(o.marginPercent ?? 0)
  }))
}

function buildCriticalIncidents(
  rupture: Record<string, unknown>,
  retardLots: Record<string, unknown>
): CriticalIncident[] {
  const incidents: CriticalIncident[] = []
  const atRisk = (rupture.materials as Array<Record<string, unknown>> | undefined) ?? []
  for (const m of atRisk.slice(0, 4)) {
    incidents.push({
      id: `stock-${m.code ?? m.materialCode}`,
      label: 'Rupture stock',
      detail: String(m.code ?? m.materialCode ?? '—'),
      severity: 'error',
      category: 'stock',
      targetRoute: '/inventaire/spare',
      targetQuery: m.code ? { ref: String(m.code) } : undefined
    })
  }
  const late = (retardLots.batches as Array<Record<string, unknown>> | undefined) ?? []
  for (const b of late.slice(0, 4)) {
    incidents.push({
      id: `batch-${b.batch_code ?? b.batch_id}`,
      label: 'Lot en retard',
      detail: String(b.batch_code ?? '—'),
      severity: 'warning',
      category: 'production',
      targetRoute: '/batch',
      targetQuery: b.batch_id ? { id: String(b.batch_id) } : undefined
    })
  }
  return incidents.slice(0, 8)
}

export function mergeCalculResponses(
  a: KpiCalculResponses,
  b: KpiCalculResponses
): KpiCalculResponses {
  const totalRevenueA = Number(a.margin.totalRevenue ?? 0)
  const totalRevenueB = Number(b.margin.totalRevenue ?? 0)
  const estimatedCostA = Number(a.margin.estimatedCost ?? 0)
  const estimatedCostB = Number(b.margin.estimatedCost ?? 0)

  const totalBatchesA = Number(a.avancement.totalBatches ?? 0)
  const totalBatchesB = Number(b.avancement.totalBatches ?? 0)
  const completedA = Number(a.avancement.completedBatches ?? 0)
  const completedB = Number(b.avancement.completedBatches ?? 0)
  const totalBatches = totalBatchesA + totalBatchesB
  const completedBatches = completedA + completedB

  const activeA = Number(a.avancement.totalActiveBatches ?? 0)
  const activeB = Number(b.avancement.totalActiveBatches ?? 0)
  const progressA = Number(a.avancement.averageProgress ?? 0)
  const progressB = Number(b.avancement.averageProgress ?? 0)
  const totalActive = activeA + activeB

  const consumptionA = Number(a.rotation.averageConsumptionPerDay ?? 0)
  const consumptionB = Number(b.rotation.averageConsumptionPerDay ?? 0)
  const materialsA = Number(a.rotation.totalMaterials ?? 0)
  const materialsB = Number(b.rotation.totalMaterials ?? 0)
  const totalMaterials = materialsA + materialsB

  const atRiskA = (a.rotation.atRiskMaterials as Array<Record<string, unknown>> | undefined) ?? []
  const atRiskB = (b.rotation.atRiskMaterials as Array<Record<string, unknown>> | undefined) ?? []
  const atRiskMerged = [...atRiskA, ...atRiskB]
    .sort((x, y) => Number(y.score ?? 0) - Number(x.score ?? 0))
    .slice(0, 5)

  const ordersA = (a.margin.orders as Array<Record<string, unknown>> | undefined) ?? []
  const ordersB = (b.margin.orders as Array<Record<string, unknown>> | undefined) ?? []
  const ordersMerged = [...ordersA, ...ordersB].sort(
    (x, y) => Number(x.marginPercent ?? 0) - Number(y.marginPercent ?? 0)
  )

  const ruptureMaterials = [
    ...((a.rupture.materials as Array<Record<string, unknown>> | undefined) ?? []),
    ...((b.rupture.materials as Array<Record<string, unknown>> | undefined) ?? [])
  ]
  const lateBatches = [
    ...((a.retardLots.batches as Array<Record<string, unknown>> | undefined) ?? []),
    ...((b.retardLots.batches as Array<Record<string, unknown>> | undefined) ?? [])
  ]

  return {
    rupture: {
      totalRuptureProducts:
        Number(a.rupture.totalRuptureProducts ?? 0) + Number(b.rupture.totalRuptureProducts ?? 0),
      materials: ruptureMaterials
    },
    rotation: {
      averageConsumptionPerDay: totalMaterials > 0
        ? Math.round(((consumptionA * materialsA) + (consumptionB * materialsB)) / totalMaterials * 100) / 100
        : 0,
      atRiskMaterials: atRiskMerged
    },
    urgentOrders: {
      totalUrgentOrders:
        Number(a.urgentOrders.totalUrgentOrders ?? 0) + Number(b.urgentOrders.totalUrgentOrders ?? 0)
    },
    delayRisk: {
      totalDelayRiskOrders:
        Number(a.delayRisk.totalDelayRiskOrders ?? 0) + Number(b.delayRisk.totalDelayRiskOrders ?? 0)
    },
    margin: {
      totalRevenue: totalRevenueA + totalRevenueB,
      estimatedCost: estimatedCostA + estimatedCostB,
      orders: ordersMerged
    },
    totalDelay: {
      estimatedDelayCost:
        Number(a.totalDelay.estimatedDelayCost ?? 0) + Number(b.totalDelay.estimatedDelayCost ?? 0)
    },
    avancement: {
      totalBatches,
      completedBatches,
      yieldRate: totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0,
      totalActiveBatches: totalActive,
      averageProgress: totalActive > 0
        ? Math.round(((progressA * activeA) + (progressB * activeB)) / totalActive)
        : 0
    },
    retardLots: {
      lateBatches:
        Number(a.retardLots.lateBatches ?? 0) + Number(b.retardLots.lateBatches ?? 0),
      batches: lateBatches
    }
  }
}

export function mapCalculResponsesToDashboard(responses: KpiCalculResponses): KpiDashboard {
  const { rupture, rotation, urgentOrders, delayRisk, margin, totalDelay, avancement, retardLots } = responses

  const totalRevenue = Number(margin.totalRevenue ?? 0)
  const estimatedCost = Number(margin.estimatedCost ?? 0)
  const globalMargin = totalRevenue > 0
    ? (((totalRevenue - estimatedCost) / totalRevenue) * 100).toFixed(1)
    : '0.0'

  const estimatedDelayCost = formatCurrency(Number(totalDelay.estimatedDelayCost ?? 0))

  return {
    globalMargin,
    totalValue: formatCurrency(totalRevenue),
    estimatedDelayCost,
    marginOrders: mapMarginOrders(margin),

    yieldRate: Number(avancement.yieldRate ?? 0),
    averageProgress: Number(avancement.averageProgress ?? 0),
    activeBatches: Number(avancement.totalActiveBatches ?? 0),
    lateBatches: Number(retardLots.lateBatches ?? 0),

    stockRuptures: Number(rupture.totalRuptureProducts ?? 0),
    atRiskMaterials: mapAtRiskMaterials(rotation),
    averageConsumptionPerDay: Number(rotation.averageConsumptionPerDay ?? 0),

    urgentOrders: Number(urgentOrders.totalUrgentOrders ?? 0),
    delayRiskOrders: Number(delayRisk.totalDelayRiskOrders ?? 0),

    criticalIncidents: buildCriticalIncidents(rupture, retardLots)
  }
}

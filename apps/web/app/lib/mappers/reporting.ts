import type { KpiDashboard } from '~/types'

function formatCurrency(value: number) {
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export function mapCalculResponsesToDashboard(responses: {
  rupture: Record<string, unknown>
  rotation: Record<string, unknown>
  urgentOrders: Record<string, unknown>
  delayRisk: Record<string, unknown>
  margin: Record<string, unknown>
  totalDelay: Record<string, unknown>
  avancement: Record<string, unknown>
  retardLots: Record<string, unknown>
}): KpiDashboard {
  const { rupture, urgentOrders, delayRisk, margin, totalDelay, avancement, retardLots } = responses

  const totalRevenue = Number(margin.totalRevenue ?? 0)
  const estimatedCost = Number(margin.estimatedCost ?? 0)
  const globalMargin = totalRevenue > 0
    ? (((totalRevenue - estimatedCost) / totalRevenue) * 100).toFixed(1)
    : '0.0'

  const batchAnomalies = Number(retardLots.lateBatches ?? 0)
  const delayedOrders =
    Number(urgentOrders.totalUrgentOrders ?? 0)
    + Number(delayRisk.totalDelayRiskOrders ?? 0)
    + Number(rupture.totalRuptureProducts ?? 0)
    + Number(totalDelay.totalDelays ?? 0)

  const yieldRate = Number(avancement.averageProgress ?? 0)

  const marginOrders = Array.isArray(margin.orders)
    ? (margin.orders as Array<Record<string, unknown>>).map((o, index) => ({
        id: index + 1,
        ofNumber: String(o.orderNumber ?? o.ofNumber ?? `OF-${index + 1}`),
        client: String(o.clientName ?? o.client ?? '—'),
        product: String(o.productCode ?? o.product ?? '—'),
        costPrice: Number(o.estimatedCost ?? o.costPrice ?? 0),
        sellingPrice: Number(o.totalAmount ?? o.sellingPrice ?? 0),
        marginPercent: Number(o.marginPercent ?? 0)
      }))
    : []

  const criticalIncidents: KpiDashboard['criticalIncidents'] = []
  const atRisk = (rupture.materials as Array<Record<string, unknown>> | undefined) ?? []
  for (const m of atRisk.slice(0, 4)) {
    criticalIncidents.push({
      id: `stock-${m.code ?? m.materialCode}`,
      label: 'Risque rupture',
      detail: String(m.description ?? m.code ?? '—'),
      severity: 'error',
      targetRoute: '/inventaire/spare'
    })
  }
  const late = (retardLots.batches as Array<Record<string, unknown>> | undefined) ?? []
  for (const b of late.slice(0, 4)) {
    criticalIncidents.push({
      id: `batch-${b.batch_code ?? b.batch_id}`,
      label: 'Lot en retard',
      detail: String(b.batch_code ?? '—'),
      severity: 'warning',
      targetRoute: '/batch'
    })
  }

  return {
    globalMargin,
    delayedOrders,
    bomAnomalies: batchAnomalies,
    totalValue: formatCurrency(totalRevenue),
    yieldRate,
    marginOrders,
    criticalIncidents: criticalIncidents.slice(0, 8)
  }
}

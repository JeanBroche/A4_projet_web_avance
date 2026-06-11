import { simulateDelay } from '~/lib/api/client'
import { getMockBatches, getMockBomOrders } from '~/lib/adapters/mock/production.mock'
import { getMockOrders } from '~/lib/adapters/mock/order.mock'
import { getMockShipments } from '~/lib/adapters/mock/shipment.mock'
import { getMockSupplierDelays } from '~/lib/adapters/mock/supplier-delay-store'
import { getMockStockLevels } from '~/lib/adapters/mock/stock.mock'
import type { NotificationAdapter } from '~/lib/adapters/types'
import type { AppNotification } from '~/types'

function buildLiveNotifications(): AppNotification[] {
  const now = Date.now()
  const items: AppNotification[] = []

  for (const part of getMockStockLevels()) {
    if (part.available === 0) {
      items.push({
        id: `stock-out-${part.reference}`,
        severity: 'error',
        title: 'Rupture de stock',
        message: `${part.name} (${part.reference}) — indisponible`,
        source: 'stock',
        read: false,
        createdAt: new Date(now - 3600000)
      })
    } else if (part.available < part.minQty) {
      items.push({
        id: `stock-low-${part.reference}`,
        severity: 'warning',
        title: 'Stock faible',
        message: `${part.reference} : ${part.available} ${part.unit} restants (seuil ${part.minQty})`,
        source: 'stock',
        read: false,
        createdAt: new Date(now - 7200000)
      })
    }
  }

  for (const s of getMockShipments()) {
    if (s.status === 'delayed' || s.delayDays > 0) {
      items.push({
        id: `ship-delay-${s.id}`,
        severity: 'error',
        title: 'Retard expédition',
        message: `${s.shipmentNumber} — ${s.client} (+${s.delayDays} j)`,
        source: 'shipment',
        read: false,
        createdAt: new Date(now - 1800000)
      })
    }
  }

  for (const o of getMockOrders()) {
    if (o.hasAnomaly) {
      items.push({
        id: `order-anomaly-${o.id}`,
        severity: 'warning',
        title: 'Anomalie commande',
        message: `${o.orderNumber} — ${o.client}`,
        source: 'order',
        read: false,
        createdAt: new Date(now - 5400000)
      })
    }
  }

  for (const b of getMockBatches()) {
    if (b.hasAnomaly) {
      items.push({
        id: `batch-anomaly-${b.id}`,
        severity: 'warning',
        title: 'Incident lot',
        message: `${b.lotNumber} — ${b.productName} (OF ${b.ofNumber})`,
        source: 'production',
        read: false,
        createdAt: new Date(now - 900000)
      })
    }
  }

  for (const of_ of getMockBomOrders()) {
    if (of_.hasBomAnomaly) {
      items.push({
        id: `bom-anomaly-${of_.id}`,
        severity: 'warning',
        title: 'Rupture nomenclature',
        message: `${of_.ofNumber} — matières insuffisantes`,
        source: 'production',
        read: false,
        createdAt: new Date(now - 10800000)
      })
    }
  }

  for (const d of getMockSupplierDelays()) {
    items.push({
      id: d.id,
      severity: d.delayDays >= 5 ? 'error' : 'warning',
      title: 'Retard fournisseur',
      message: `${d.materialName} (${d.supplier}) — +${d.delayDays} j`,
      source: 'stock',
      read: false,
      createdAt: d.reportedAt
    })
  }

  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function createMockNotificationAdapter(): NotificationAdapter {
  return {
    async list() {
      await simulateDelay(80)
      return buildLiveNotifications()
    }
  }
}

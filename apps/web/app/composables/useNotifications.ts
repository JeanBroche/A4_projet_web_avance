import { getMockBatches, getMockBomOrders } from '~/lib/adapters/mock/production.mock'
import { getMockOrders } from '~/lib/adapters/mock/order.mock'
import { getMockShipments } from '~/lib/adapters/mock/shipment.mock'
import { getMockStockLevels } from '~/lib/adapters/mock/stock.mock'
import type { AppNotification } from '~/types'

const readIds = useState<string[]>('notifications:read', () => [])

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
        message: `${b.lotNumber} — ${b.productName}`,
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

  return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function useNotifications() {
  const { canViewNotifications } = useRoleCapabilities()

  const notifications = computed(() => {
    if (!canViewNotifications.value) return []
    return buildLiveNotifications().map(n => ({
      ...n,
      read: readIds.value.includes(n.id)
    }))
  })

  const unreadCount = computed(() =>
    notifications.value.filter(n => !n.read).length
  )

  function markAsRead(id: string) {
    if (!readIds.value.includes(id)) {
      readIds.value = [...readIds.value, id]
    }
  }

  function markAllAsRead() {
    readIds.value = notifications.value.map(n => n.id)
  }

  function refresh() {
    // Les notifications sont recalculées depuis les stores mock (réactivité via accès computed).
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh }
}

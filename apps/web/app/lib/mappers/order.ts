import { toNumericId } from '~/lib/mappers/id'

type BackendOrder = {
  id: string
  orderNumber: string
  status: string
  isUrgent?: boolean
  promisedDeliveryDate?: string | Date | null
  createdAt: string | Date
  totalAmount?: number
  client?: { name?: string; code?: string }
  lines?: Array<{ quantity?: number }>
}

const STATUS_MAP: Record<string, 'prepared' | 'shipped' | 'delivered'> = {
  DRAFT: 'prepared',
  VALIDATED: 'prepared',
  IN_PRODUCTION: 'prepared',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  REJECTED: 'prepared'
}

const VALIDATION_MAP: Record<string, 'pending' | 'validated' | 'rejected'> = {
  DRAFT: 'pending',
  VALIDATED: 'validated',
  IN_PRODUCTION: 'validated',
  SHIPPED: 'validated',
  DELIVERED: 'validated',
  REJECTED: 'rejected'
}

const UI_TO_BACKEND_STATUS: Record<string, string> = {
  prepared: 'VALIDATED',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED'
}

export function mapOrderToUi(order: BackendOrder) {
  const itemsCount = order.lines?.reduce((sum, line) => sum + (line.quantity ?? 0), 0) ?? 0
  return {
    id: toNumericId(order.id),
    orderNumber: order.orderNumber,
    client: order.client?.name ?? order.client?.code ?? '—',
    destination: order.client?.code ?? '—',
    createdAt: new Date(order.createdAt).toISOString().slice(0, 10),
    itemsCount,
    weight: `${Math.max(1, itemsCount)} kg`,
    carrier: 'AERONEXIS Logistics',
    status: STATUS_MAP[order.status] ?? 'prepared',
    validationStatus: VALIDATION_MAP[order.status] ?? 'pending',
    priority: order.isUrgent ? ('urgent' as const) : ('normal' as const),
    hasAnomaly: false,
    emoji: '📦',
    deliveryDate: order.promisedDeliveryDate
      ? new Date(order.promisedDeliveryDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  }
}

export function mapUiStatusToBackend(status: string) {
  return UI_TO_BACKEND_STATUS[status] ?? status.toUpperCase()
}

export function mapClientStatsToUi(stats: {
  clientName?: string
  clientCode?: string
  stats?: {
    orderCount?: number
    deliveredCount?: number
    urgentCount?: number
    averageLeadTimeDays?: number | null
    totalRevenue?: number
    byStatus?: Record<string, number>
  }
}) {
  const inner = stats.stats ?? {}
  const deliveredCount = inner.deliveredCount ?? inner.byStatus?.DELIVERED ?? 0
  return {
    client: stats.clientName ?? stats.clientCode ?? '—',
    orderCount: inner.orderCount ?? 0,
    deliveredCount,
    urgentCount: inner.urgentCount ?? 0,
    averageLeadDays: inner.averageLeadTimeDays ?? 0,
    totalRevenueEstimate: inner.totalRevenue ?? 0
  }
}

export function mapOrderHistoryToUi(entries: Array<{
  createdAt?: string | Date
  toStatus?: string
  status?: string
  orderNumber?: string
  notes?: string | null
  changedBy?: string
}>) {
  return entries.map(entry => ({
    at: new Date(entry.createdAt ?? Date.now()),
    label: entry.toStatus ?? entry.status ?? entry.orderNumber ?? 'Mise à jour',
    description: entry.notes ?? `Par ${entry.changedBy ?? 'système'}`
  }))
}

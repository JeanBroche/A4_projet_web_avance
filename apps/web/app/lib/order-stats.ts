import type { Order, OrderStatus } from '~/types'

export type LogisticsBreakdownColor = 'primary' | 'warning' | 'success'

export type LogisticsBreakdownRow = {
  label: string
  value: number
  count: number
  color: LogisticsBreakdownColor
}

const LOGISTICS_ROWS: Array<{
  label: string
  status: OrderStatus
  color: LogisticsBreakdownColor
}> = [
  { label: 'Préparées', status: 'prepared', color: 'primary' },
  { label: 'Expédiées', status: 'shipped', color: 'warning' },
  { label: 'Livrées', status: 'delivered', color: 'success' }
]

/** Commandes entrées dans le flux logistique (validation commerciale passée). */
export function filterLogisticsOrders(orders: Order[]): Order[] {
  return orders.filter((order) => order.validationStatus === 'validated')
}

export function computeLogisticsStatusBreakdown(orders: Order[]): {
  total: number
  rows: LogisticsBreakdownRow[]
} {
  const logisticsOrders = filterLogisticsOrders(orders)
  const total = logisticsOrders.length

  const rows = LOGISTICS_ROWS.map(({ label, status, color }) => {
    const count = logisticsOrders.filter((order) => order.status === status).length
    const value = total === 0 ? 0 : Math.round((count / total) * 100)
    return { label, value, count, color }
  })

  return { total, rows }
}

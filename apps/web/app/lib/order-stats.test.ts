import { describe, expect, it } from 'vitest'
import { computeLogisticsStatusBreakdown, filterLogisticsOrders } from '~/lib/order-stats'
import type { Order } from '~/types'

function order(partial: Partial<Order> & Pick<Order, 'id' | 'validationStatus' | 'status'>): Order {
  return {
    orderNumber: `CMD-${partial.id}`,
    client: 'Client',
    destination: 'Dest',
    createdAt: '2026-06-01',
    deliveryDate: '2026-06-15',
    itemsCount: 1,
    weight: '1 kg',
    carrier: 'DHL',
    priority: 'normal',
    hasAnomaly: false,
    emoji: '📦',
    ...partial
  }
}

describe('order-stats', () => {
  it('excludes draft and rejected orders from logistics breakdown', () => {
    const orders = [
      order({ id: 1, validationStatus: 'pending', status: 'prepared' }),
      order({ id: 2, validationStatus: 'rejected', status: 'prepared' }),
      order({ id: 3, validationStatus: 'validated', status: 'prepared' }),
      order({ id: 4, validationStatus: 'validated', status: 'shipped' }),
      order({ id: 5, validationStatus: 'validated', status: 'delivered' })
    ]

    expect(filterLogisticsOrders(orders)).toHaveLength(3)

    const { total, rows } = computeLogisticsStatusBreakdown(orders)
    expect(total).toBe(3)
    expect(rows).toEqual([
      { label: 'Préparées', value: 33, count: 1, color: 'primary' },
      { label: 'Expédiées', value: 33, count: 1, color: 'warning' },
      { label: 'Livrées', value: 33, count: 1, color: 'success' }
    ])
  })

  it('returns zeroed rows when no validated order exists', () => {
    const { total, rows } = computeLogisticsStatusBreakdown([
      order({ id: 1, validationStatus: 'pending', status: 'prepared' })
    ])

    expect(total).toBe(0)
    expect(rows.every((row) => row.value === 0 && row.count === 0)).toBe(true)
  })
})

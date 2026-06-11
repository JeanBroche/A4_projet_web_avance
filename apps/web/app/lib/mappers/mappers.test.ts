import { describe, expect, it } from 'vitest'
import { mapOrderToUi } from '~/lib/mappers/order'
import { mapMaterialToStockLevel } from '~/lib/mappers/stock'
import { toNumericId } from '~/lib/mappers/id'

describe('front mappers', () => {
  it('maps order summary to UI shape', () => {
    const ui = mapOrderToUi({
      id: 'order-1',
      orderNumber: 'CMD-2026-00001',
      status: 'VALIDATED',
      isUrgent: true,
      createdAt: '2026-01-01',
      client: { name: 'Airbus', code: 'AIRBUS' },
      lines: [{ quantity: 3 }]
    })
    expect(ui.orderNumber).toBe('CMD-2026-00001')
    expect(ui.validationStatus).toBe('validated')
    expect(ui.priority).toBe('urgent')
    expect(ui.id).toBe(toNumericId('order-1'))
    expect(ui.hasAnomaly).toBe(false)
  })

  it('maps material level to UI shape', () => {
    const ui = mapMaterialToStockLevel({
      materialId: 'mat-1',
      code: 'MAT-001',
      description: 'Acier',
      unit: 'pcs',
      current: 10,
      reserved: 2,
      available: 8,
      minimum: 5
    })
    expect(ui.reference).toBe('MAT-001')
    expect(ui.available).toBe(8)
    expect(ui.id).toBe(toNumericId('mat-1'))
  })
})

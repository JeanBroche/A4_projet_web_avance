import { describe, expect, it } from 'vitest'
import { mapOrderToUi } from '~/lib/mappers/order'
import { mapBomToUi } from '~/lib/mappers/production'
import { mapMaterialToStockLevel, mapReservationToUi } from '~/lib/mappers/stock'
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

  it('maps reservation materialId to stock code', () => {
    const ui = mapReservationToUi({
      id: 'res-1',
      ofId: 'BOM-SEED-001',
      materialId: 'clmatinternal0001',
      quantity: 4,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      material: { code: 'MAT-001', description: 'Acier', unit: 'kg' }
    })
    expect(ui.materialId).toBe('MAT-001')
    expect(ui.ofId).toBe('BOM-SEED-001')
  })

  it('computes BOM need from per-unit coefficient × order qty', () => {
    const ui = mapBomToUi({
      id: 'bom-1',
      bom_code: 'BOM-SEED-004',
      description: 'Bras',
      quantity: 10,
      status: 'PENDING',
      lines: [
        { material_id: 'MAT-001', quantity: 1 },
        { material_id: 'MAT-004', quantity: 2 }
      ]
    })
    expect(ui.bom[0]?.qtyPerUnit).toBe(1)
    expect(ui.bom[0]?.qtyNeeded).toBe(10)
    expect(ui.bom[1]?.qtyNeeded).toBe(20)
    expect(ui.bom[0]?.qtyStock).toBe(0)
  })
})

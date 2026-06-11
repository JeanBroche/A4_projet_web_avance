import { describe, expect, it } from 'vitest'
import { createMockReservations, seedMockReservations } from './reservation-store'
import type { StockLevel } from '~/types'

const parts: StockLevel[] = [
  {
    id: 1,
    emoji: '🔩',
    name: 'Boulon',
    reference: 'BLN-M8-040',
    category: 'Visserie',
    description: '',
    dimensions: '—',
    qty: 80,
    reserved: 0,
    available: 80,
    unit: 'pcs',
    minQty: 10
  }
]

describe('createMockReservations', () => {
  it('blocks duplicate reservation for same OF and material', () => {
    seedMockReservations([])
    const deps = {
      getParts: () => parts,
      setPartReserved: (ref: string, delta: number) => {
        const p = parts.find(x => x.reference === ref)!
        p.reserved = Math.max(0, p.reserved + delta)
        p.available = Math.max(0, p.qty - p.reserved)
      }
    }

    createMockReservations(
      { ofId: 'OF-TEST', lines: [{ materialId: 'BLN-M8-040', qty: 5 }] },
      deps
    )

    expect(() =>
      createMockReservations(
        { ofId: 'OF-TEST', lines: [{ materialId: 'BLN-M8-040', qty: 3 }] },
        deps
      )
    ).toThrow(/déjà réservé/)
  })
})

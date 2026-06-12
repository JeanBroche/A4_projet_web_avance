import { describe, expect, it } from 'vitest'
import {
  computeBomNeed,
  deriveQtyPerUnit,
  formatBomQty,
  normalizeQtyPerUnit,
  toStockReservationQty
} from '~/lib/bom-utils'

describe('bom-utils', () => {
  it('multiplies per-unit coefficient by order quantity', () => {
    expect(computeBomNeed(1, 10)).toBe(10)
    expect(computeBomNeed(1.6, 10)).toBe(16)
  })

  it('derives per-unit from total need', () => {
    expect(deriveQtyPerUnit(16, 10)).toBe(1.6)
  })

  it('formats ugly floating coefficients', () => {
    expect(formatBomQty(1.4285714285714286)).toBe('1.43')
    expect(normalizeQtyPerUnit(1.4285714285714286)).toBe(1.43)
  })

  it('converts fractional BOM need to integer stock qty', () => {
    expect(toStockReservationQty(1.43)).toBe(2)
    expect(toStockReservationQty(16)).toBe(16)
  })
})

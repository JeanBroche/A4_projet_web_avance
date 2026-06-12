import { describe, expect, it } from 'vitest'
import { buildMaterialReferenceOptions } from './material-catalog'

describe('buildMaterialReferenceOptions', () => {
  it('includes seed catalog even when stock levels are empty', () => {
    const options = buildMaterialReferenceOptions([])
    expect(options.length).toBeGreaterThanOrEqual(4)
    expect(options.some(o => o.value === 'MAT-001')).toBe(true)
    expect(options.find(o => o.value === 'MAT-001')?.name).toContain('Acier inox')
  })

  it('enriches catalog entries with live stock availability', () => {
    const options = buildMaterialReferenceOptions([
      {
        id: 1,
        emoji: '🔩',
        name: 'Acier inox 316L — usinage aéronautique',
        reference: 'MAT-001',
        category: 'metal',
        description: '',
        dimensions: '—',
        qty: 120,
        reserved: 2,
        available: 118,
        unit: 'kg',
        minQty: 50
      }
    ])
    expect(options.find(o => o.value === 'MAT-001')?.available).toBe(118)
  })
})

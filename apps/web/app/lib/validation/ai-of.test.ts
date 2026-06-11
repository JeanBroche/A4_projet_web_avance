import { describe, expect, it } from 'vitest'
import {
  filterBomByKnownMaterials,
  parseAiOfResponse
} from './ai-of'

describe('ai-of validation', () => {
  it('parses valid JSON proposal', () => {
    const raw = JSON.stringify({
      name: 'Bras articulé A320',
      ofNumber: 'OF-2026-0142',
      qty: 4,
      status: 'pending',
      priority: 'high',
      emoji: '✈️',
      bom: [
        { reference: 'AXE-012-500', name: 'Axe acier', qtyNeeded: 8, unit: 'pcs' }
      ],
      summary: 'Proposition pour 4 bras articulés.'
    })

    const proposal = parseAiOfResponse(raw)
    expect(proposal.name).toBe('Bras articulé A320')
    expect(proposal.bom).toHaveLength(1)
  })

  it('filters unknown material references', () => {
    const proposal = parseAiOfResponse(JSON.stringify({
      name: 'Test',
      ofNumber: 'OF-2026-0001',
      qty: 1,
      status: 'pending',
      priority: 'normal',
      emoji: '🔧',
      bom: [
        { reference: 'KNOWN-REF', name: 'Known', qtyNeeded: 2, unit: 'pcs' },
        { reference: 'UNKNOWN-REF', name: 'Unknown', qtyNeeded: 1, unit: 'pcs' }
      ],
      summary: 'Test'
    }))

    const filtered = filterBomByKnownMaterials(proposal, [
      { reference: 'KNOWN-REF', name: 'Known', unit: 'pcs', available: 10 }
    ])

    expect(filtered.bom).toHaveLength(1)
    expect(filtered.bom[0]?.reference).toBe('KNOWN-REF')
  })
})

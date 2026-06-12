import type { Batch } from '~/types'

export function createInitialBatches(): Batch[] {
  return [
    {
      id: 1,
      lotNumber: 'LOT-24-001',
      ofNumber: 'OF-2024-0142',
      bomCode: 'OF-2024-0142',
      productName: 'Axe Titane A320',
      emoji: '🔩',
      qty: 50,
      status: 'in_progress',
      priority: 'high',
      hasAnomaly: false,
      progress: 83,
      createdAt: '2024-05-20',
      bom: [
        { reference: 'RAW-TI-001', name: 'Barre Titane Grade 5', qtyNeeded: 5, qtyStock: 12, unit: 'm' },
        { reference: 'OIL-CUT-S', name: 'Huile de coupe synthétique', qtyNeeded: 2, qtyStock: 25, unit: 'L' }
      ]
    },
    {
      id: 2,
      lotNumber: 'LOT-24-002',
      ofNumber: 'OF-2024-0140',
      bomCode: 'OF-2024-0140',
      productName: 'Joint Silicone B737',
      emoji: '💠',
      qty: 200,
      status: 'pending',
      priority: 'normal',
      hasAnomaly: true,
      progress: 0,
      createdAt: '2024-05-21',
      bom: [
        { reference: 'SIL-MED-02', name: 'Silicone Médical Noir', qtyNeeded: 40, qtyStock: 10, unit: 'kg' }
      ]
    }
  ]
}

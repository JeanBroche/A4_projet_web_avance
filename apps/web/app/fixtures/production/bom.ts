import type { ManufacturingOrder } from '~/types'

export function createInitialBomOrders(): ManufacturingOrder[] {
  return [
    { id: 1, name: 'Bras articulé A320', emoji: '✈️', ofNumber: 'OF-2024-0142', qty: 4, status: 'in_progress', priority: 'critical', bom: [
      { reference: 'AXE-012-500', name: 'Axe acier Ø12', qtyNeeded: 8, qtyStock: 6, unit: 'pcs' },
      { reference: 'RLM-6205-ZZ', name: 'Roulement 6205-ZZ', qtyNeeded: 16, qtyStock: 24, unit: 'pcs' },
      { reference: 'VIS-M6-020', name: 'Vis M6 x 20', qtyNeeded: 40, qtyStock: 450, unit: 'pcs' },
      { reference: 'JNT-NBR-202', name: 'Joint torique NBR 20×2', qtyNeeded: 12, qtyStock: 0, unit: 'pcs' },
      { reference: 'GRS-MK-BR2', name: 'Graisse Molykote BR2', qtyNeeded: 0.5, qtyStock: 3, unit: 'kg' }
    ] },
    { id: 2, name: 'Support moteur B737', emoji: '🔧', ofNumber: 'OF-2024-0143', qty: 2, status: 'pending', priority: 'high', bom: [
      { reference: 'PRF-AL-4040', name: 'Profilé alu 40×40', qtyNeeded: 6, qtyStock: 12, unit: 'm' },
      { reference: 'BLN-M8-040', name: 'Boulon M8 x 40', qtyNeeded: 24, qtyStock: 80, unit: 'pcs' },
      { reference: 'ECR-M6-FR', name: 'Écrou frein M6', qtyNeeded: 24, qtyStock: 320, unit: 'pcs' },
      { reference: 'CAB-AC-004', name: 'Câble acier Ø4', qtyNeeded: 10, qtyStock: 85, unit: 'm' }
    ] },
    { id: 3, name: 'Verrouillage train ATR', emoji: '⚙️', ofNumber: 'OF-2024-0139', qty: 6, status: 'done', priority: 'normal', bom: [
      { reference: 'CHP-INX-008', name: 'Chape Ø8 inox', qtyNeeded: 12, qtyStock: 18, unit: 'pcs' },
      { reference: 'VIS-M6-020', name: 'Vis M6 x 20', qtyNeeded: 30, qtyStock: 450, unit: 'pcs' },
      { reference: 'RLM-6205-ZZ', name: 'Roulement 6205-ZZ', qtyNeeded: 6, qtyStock: 24, unit: 'pcs' }
    ] },
    { id: 4, name: 'Panneau cockpit C130', emoji: '🛩️', ofNumber: 'OF-2024-0145', qty: 1, status: 'pending', priority: 'low', bom: [
      { reference: 'PRF-AL-4040', name: 'Profilé alu 40×40', qtyNeeded: 4, qtyStock: 12, unit: 'm' },
      { reference: 'VIS-M6-020', name: 'Vis M6 x 20', qtyNeeded: 60, qtyStock: 450, unit: 'pcs' },
      { reference: 'CAB-AC-004', name: 'Câble acier Ø4', qtyNeeded: 25, qtyStock: 85, unit: 'm' },
      { reference: 'AXE-012-500', name: 'Axe acier Ø12', qtyNeeded: 10, qtyStock: 6, unit: 'pcs' }
    ] },
    { id: 5, name: 'Vérin hydraulique F/A-18', emoji: '🔩', ofNumber: 'OF-2024-0140', qty: 3, status: 'in_progress', priority: 'high', bom: [
      { reference: 'JNT-NBR-202', name: 'Joint torique NBR 20×2', qtyNeeded: 18, qtyStock: 0, unit: 'pcs' },
      { reference: 'AXE-012-500', name: 'Axe acier Ø12', qtyNeeded: 3, qtyStock: 6, unit: 'pcs' },
      { reference: 'GRS-MK-BR2', name: 'Graisse Molykote BR2', qtyNeeded: 1, qtyStock: 3, unit: 'kg' }
    ] },
    { id: 6, name: 'Soute cargo A400M', emoji: '📦', ofNumber: 'OF-2024-0141', qty: 2, status: 'done', priority: 'normal', bom: [
      { reference: 'PRF-AL-4040', name: 'Profilé alu 40×40', qtyNeeded: 20, qtyStock: 12, unit: 'm' },
      { reference: 'BLN-M8-040', name: 'Boulon M8 x 40', qtyNeeded: 60, qtyStock: 80, unit: 'pcs' },
      { reference: 'CHP-INX-008', name: 'Chape Ø8 inox', qtyNeeded: 8, qtyStock: 18, unit: 'pcs' }
    ]}
  ]
}

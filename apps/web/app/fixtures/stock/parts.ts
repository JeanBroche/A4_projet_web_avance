import type { StockLevel } from '~/types'

function level(
  part: Omit<StockLevel, 'reserved' | 'available'> & { reserved?: number }
): StockLevel {
  const reserved = part.reserved ?? 0
  return { ...part, reserved, available: Math.max(0, part.qty - reserved) }
}

export function createInitialParts(): StockLevel[] {
  return [
    level({ id: 1, emoji: '🔩', name: 'Vis M6 x 20', reference: 'VIS-M6-020', category: 'Visserie', description: 'Vis à tête hexagonale en acier inoxydable 316L, traitement anti-corrosion.', dimensions: 'M6 × 20 mm', qty: 450, unit: 'pcs', minQty: 100 }),
    level({ id: 2, emoji: '🔩', name: 'Boulon M8 x 40', reference: 'BLN-M8-040', category: 'Visserie', description: 'Boulon haute résistance classe 8.8, tête hexagonale, filetage complet.', dimensions: 'M8 × 40 mm', qty: 80, reserved: 24, unit: 'pcs', minQty: 100 }),
    level({ id: 3, emoji: '⚙️', name: 'Roulement 6205-ZZ', reference: 'RLM-6205-ZZ', category: 'Roulements', description: 'Roulement à billes double blindage, acier chromé, graisse haute température.', dimensions: 'Ø25 × Ø52 × 15 mm', qty: 24, unit: 'pcs', minQty: 10 }),
    level({ id: 4, emoji: '🪛', name: 'Axe acier Ø12', reference: 'AXE-012-500', category: 'Axes & Arbres', description: 'Axe en acier rectifié h6, tolérance serrée, acier C45 traité.', dimensions: 'Ø12 × 500 mm', qty: 6, unit: 'pcs', minQty: 10 }),
    level({ id: 5, emoji: '🔧', name: 'Écrou frein M6', reference: 'ECR-M6-FR', category: 'Visserie', description: 'Écrou nylstop inox A2, auto-freinant, résistant aux vibrations.', dimensions: 'M6', qty: 320, unit: 'pcs', minQty: 200 }),
    level({ id: 6, emoji: '🧲', name: 'Joint torique NBR 20×2', reference: 'JNT-NBR-202', category: 'Joints', description: 'Joint torique en caoutchouc NBR, résistant aux huiles et carburants, -30°C/+120°C.', dimensions: 'Ø20 × 2 mm', qty: 0, unit: 'pcs', minQty: 50 }),
    level({ id: 7, emoji: '📐', name: 'Profilé alu 40×40', reference: 'PRF-AL-4040', category: 'Profilés', description: 'Profilé aluminium anodisé 6060-T5, rainure 8 mm, usage structural.', dimensions: '40 × 40 mm — 3 m', qty: 12, unit: 'm', minQty: 20 }),
    level({ id: 8, emoji: '🔗', name: 'Câble acier Ø4', reference: 'CAB-AC-004', category: 'Câbles', description: 'Câble toronné 7×7 en acier galvanisé, rupture 1200 kg.', dimensions: 'Ø4 mm', qty: 85, unit: 'm', minQty: 50 }),
    level({ id: 9, emoji: '🧪', name: 'Graisse Molykote BR2', reference: 'GRS-MK-BR2', category: 'Lubrifiants', description: 'Graisse au bisulfure de molybdène, hautes pressions, -40°C/+180°C.', dimensions: '—', qty: 3, unit: 'kg', minQty: 5 }),
    level({ id: 10, emoji: '🪝', name: 'Chape Ø8 inox', reference: 'CHP-INX-008', category: 'Fixations', description: 'Chape droite inox A4, corps forgé, axe démontable, WLL 500 kg.', dimensions: 'Ø8 mm', qty: 18, unit: 'pcs', minQty: 10 })
  ]
}

export const CATEGORY_EMOJI: Record<string, string> = {
  'Visserie': '🔩',
  'Roulements': '⚙️',
  'Axes & Arbres': '🪛',
  'Joints': '🧲',
  'Profilés': '📐',
  'Câbles': '🔗',
  'Lubrifiants': '🧪',
  'Fixations': '🪝'
}

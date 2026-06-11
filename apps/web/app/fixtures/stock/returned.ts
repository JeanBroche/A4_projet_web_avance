import type { ReturnItem } from '~/types'

export function createInitialReturned(): ReturnItem[] {
  return [
    { id: 1, emoji: '⚙️', name: 'Roulement 6205-ZZ', reference: 'RLM-6205-ZZ', qty: 4, state: 'défectueux', reason: 'défaut_fabrication', date: '10/12/2024', of: 'OF-2024-0139' },
    { id: 2, emoji: '🔩', name: 'Vis M6 x 20', reference: 'VIS-M6-020', qty: 50, state: 'neuf', reason: 'excédent', date: '09/12/2024', of: 'OF-2024-0141' },
    { id: 3, emoji: '🪛', name: 'Axe acier Ø12', reference: 'AXE-012-500', qty: 2, state: 'usagé', reason: 'non_conforme', date: '08/12/2024', of: 'OF-2024-0138' },
    { id: 4, emoji: '🧲', name: 'Joint torique NBR 20×2', reference: 'JNT-NBR-202', qty: 8, state: 'défectueux', reason: 'défaut_fabrication', date: '07/12/2024', of: 'OF-2024-0140' },
    { id: 5, emoji: '🔧', name: 'Boulon M8 x 40', reference: 'BLN-M8-040', qty: 12, state: 'neuf', reason: 'erreur_commande', date: '06/12/2024' },
    { id: 6, emoji: '📐', name: 'Profilé alu 40×40', reference: 'PRF-AL-4040', qty: 3, state: 'usagé', reason: 'non_conforme', date: '05/12/2024', of: 'OF-2024-0135' }
  ]
}

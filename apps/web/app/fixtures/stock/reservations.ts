import type { StockReservation } from '~/types'

/** Réservation active de démo pour l'OF Support moteur B737 */
export function createInitialReservations(): StockReservation[] {
  return [
    {
      id: 1,
      ofId: 'OF-2024-0143',
      materialId: 'BLN-M8-040',
      materialName: 'Boulon M8 x 40',
      quantity: 24,
      unit: 'pcs',
      status: 'ACTIVE',
      createdAt: new Date('2024-12-09T10:00:00')
    }
  ]
}

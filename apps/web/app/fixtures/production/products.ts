import type { Product } from '~/types'

export function createInitialProducts(): Product[] {
  return [
    {
      id: 'prod-seed-001',
      productCode: 'PROD-001',
      description: 'Bras articulé A320 — série finie',
      quantity: 12,
      reservedQuantity: 2,
      siteCode: 'SITE-LYO'
    },
    {
      id: 'prod-seed-002',
      productCode: 'PROD-002',
      description: 'Support moteur B737',
      quantity: 5,
      reservedQuantity: 0,
      siteCode: 'SITE-LYO'
    },
    {
      id: 'prod-seed-003',
      productCode: 'PROD-003',
      description: 'Panneau cockpit C130',
      quantity: 1,
      reservedQuantity: 1,
      siteCode: 'SITE-PAR'
    }
  ]
}

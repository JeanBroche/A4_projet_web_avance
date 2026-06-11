import type { Order } from '~/types'

export function createInitialOrders(): Order[] {
  return [
    {
      id: 1,
      orderNumber: 'CMD-2026-089',
      client: 'Airbus Toulouse',
      destination: 'Zone Cargo Hall 4, France',
      createdAt: '2026-06-08',
      deliveryDate: '2026-06-18',
      itemsCount: 14,
      weight: '1 250 kg',
      carrier: 'DHL Aviation',
      status: 'prepared',
      validationStatus: 'validated',
      priority: 'normal',
      hasAnomaly: false,
      emoji: '📦'
    },
    {
      id: 2,
      orderNumber: 'CMD-2026-090',
      client: 'Boeing Seattle',
      destination: 'Port de Seattle, États-Unis',
      createdAt: '2026-06-09',
      deliveryDate: '2026-06-15',
      itemsCount: 3,
      weight: '420 kg',
      carrier: 'FedEx Priority',
      status: 'shipped',
      validationStatus: 'validated',
      priority: 'urgent',
      hasAnomaly: true,
      emoji: '✈️'
    },
    {
      id: 3,
      orderNumber: 'CMD-2026-091',
      client: 'Dassault Aviation',
      destination: 'Base Mérignac, France',
      createdAt: '2026-06-10',
      deliveryDate: '2026-06-12',
      itemsCount: 22,
      weight: '85 kg',
      carrier: 'Geodis',
      status: 'delivered',
      validationStatus: 'validated',
      priority: 'normal',
      hasAnomaly: false,
      emoji: '🚀'
    },
    {
      id: 4,
      orderNumber: 'CMD-2026-092',
      client: 'Safran Nacelles',
      destination: 'Hall Cargo 2, Hambourg, Allemagne',
      createdAt: '2026-06-11',
      deliveryDate: '2026-06-20',
      itemsCount: 8,
      weight: '640 kg',
      carrier: 'DHL Aviation',
      status: 'prepared',
      validationStatus: 'pending',
      priority: 'normal',
      hasAnomaly: false,
      emoji: '📦'
    }
  ]
}

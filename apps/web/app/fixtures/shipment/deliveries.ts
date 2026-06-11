import type { Shipment } from '~/types'

export function createInitialShipments(): Shipment[] {
  return [
    {
      id: 1,
      shipmentNumber: 'EXP-2026-401',
      orderNumber: 'CMD-2026-101',
      client: 'Airbus Hamburg',
      address: 'Kreetslag 10, 21129 Hamburg, Allemagne',
      carrier: 'FedEx Freight',
      status: 'delayed',
      departureDate: '2026-06-04',
      estimatedDelivery: '2026-06-08',
      delayDays: 2,
      emoji: '🚚'
    },
    {
      id: 2,
      shipmentNumber: 'EXP-2026-402',
      client: 'Safran Moteurs',
      address: 'Rond-point René Ravaud, 77550 Moissy-Cramayel, France',
      carrier: 'DHL Aviation',
      status: 'in_transit',
      departureDate: '2026-06-08',
      estimatedDelivery: '2026-06-11',
      delayDays: 0,
      emoji: '✈️'
    },
    {
      id: 3,
      shipmentNumber: 'EXP-2026-403',
      client: 'Eurocopter España',
      address: 'Parque Aeronáutico, 02006 Albacete, Espagne',
      carrier: 'Geodis Road',
      status: 'loading',
      departureDate: '2026-06-11',
      estimatedDelivery: '2026-06-12',
      delayDays: 0,
      emoji: '📦'
    }
  ]
}

export type DeliveryStatus = 'loading' | 'in_transit' | 'delivered' | 'delayed'

export interface Shipment {
  id: number
  shipmentNumber: string
  client: string
  address: string
  carrier: string
  status: DeliveryStatus
  departureDate: string
  estimatedDelivery: string
  delayDays: number
  emoji: string
}

export interface CreateShipmentInput {
  client: string
  address: string
  carrier: string
  estimatedDelivery: string
  emoji: string
}

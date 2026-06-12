export type DeliveryStatus = 'planned' | 'loading' | 'in_transit' | 'delivered' | 'delayed'

export interface Shipment {
  id: number
  backendId?: string
  backendStatus?: string
  shipmentNumber: string
  orderNumber?: string
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
  orderNumber?: string
  productCode?: string
}

export interface UpdateShipmentInput {
  client: string
  address: string
  carrier: string
  departureDate: string
  estimatedDelivery: string
  emoji: string
  orderNumber?: string
  status: DeliveryStatus
}

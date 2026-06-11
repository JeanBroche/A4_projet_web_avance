export type OrderStatus = 'prepared' | 'shipped' | 'delivered'
export type OrderValidationStatus = 'pending' | 'validated' | 'rejected'
export type OrderPriority = 'normal' | 'urgent'

export interface Order {
  id: number
  orderNumber: string
  client: string
  destination: string
  createdAt: string
  itemsCount: number
  weight: string
  carrier: string
  status: OrderStatus
  validationStatus: OrderValidationStatus
  priority: OrderPriority
  hasAnomaly: boolean
  emoji: string
  /** Date de livraison prévue (ISO ou affichage FR) */
  deliveryDate: string
}

export interface CreateOrderInput {
  client: string
  destination: string
  itemsCount: number
  weightValue: number
  carrier: string
  emoji: string
  priority?: OrderPriority
}

export interface ClientStats {
  client: string
  orderCount: number
  deliveredCount: number
  urgentCount: number
  averageLeadDays: number
  totalRevenueEstimate: number
}

export interface OrderHistoryEntry {
  at: Date
  label: string
  description: string
}

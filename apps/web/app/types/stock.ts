export type StockUnit = 'pcs' | 'mm' | 'cm' | 'm' | 'kg' | 'g' | 'ml' | 'l'

export interface StockLevel {
  id: number
  emoji: string
  name: string
  reference: string
  category: string
  description: string
  dimensions: string
  /** Stock physique total */
  qty: number
  /** Quantité réservée pour des OF */
  reserved: number
  /** Stock disponible (qty - reserved) */
  available: number
  unit: StockUnit
  minQty: number
}

export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'CANCELLED'

export interface StockReservation {
  id: number
  ofId: string
  materialId: string
  materialName: string
  quantity: number
  unit: StockUnit
  status: ReservationStatus
  createdAt: Date
}

export interface CreateReservationLineInput {
  materialId: string
  qty: number
}

export interface CreateReservationInput {
  ofId: string
  lines: CreateReservationLineInput[]
}

export type ReturnState = 'neuf' | 'usagé' | 'défectueux'
export type ReturnReason = 'défaut_fabrication' | 'erreur_commande' | 'non_conforme' | 'excédent'

export interface ReturnItem {
  id: number
  emoji: string
  name: string
  reference: string
  qty: number
  state: ReturnState
  reason: ReturnReason
  date: string
  of?: string
}

export interface CreateStockLevelInput {
  name: string
  reference: string
  category: string
  description: string
  dimensions: string
  qty: number
  unit: StockUnit
  minQty: number
}

export interface CreateReturnItemInput {
  name: string
  reference: string
  qty: number
  state: ReturnState
  reason: ReturnReason
  of?: string
}

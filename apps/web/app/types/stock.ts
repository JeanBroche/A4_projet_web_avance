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

/** Score de risque de rupture (0 = faible, 100 = critique). */
export interface RuptureForecast {
  reference: string
  name: string
  available: number
  minQty: number
  unit: StockUnit
  score: number
  estimatedDaysUntilRupture: number | null
}

export interface SupplierDelay {
  id: string
  materialReference: string
  materialName: string
  supplier: string
  delayDays: number
  reportedAt: Date
  comment?: string
}

export interface SupplierDelayInput {
  materialReference: string
  supplier: string
  delayDays: number
  comment?: string
}

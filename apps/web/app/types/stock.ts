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

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST'

export interface StockMovement {
  id: string
  materialId: string
  materialReference: string
  siteCode: string
  type: StockMovementType
  quantity: number
  reason?: string
  documentRef?: string
  ofId?: string
  createdAt: Date
}

export interface ConsolidatedSite {
  siteCode: string
  current: number
  reserved: number
  available: number
  minimum: number
}

export interface ConsolidatedStockLevel {
  reference: string
  name: string
  unit: StockUnit
  current: number
  reserved: number
  available: number
  minimum: number
  sites: ConsolidatedSite[]
}

export type MaterialLotStatus = 'ACTIVE' | 'EXHAUSTED' | 'QUARANTINE' | 'EXPIRED'

export interface MaterialLot {
  id: string
  materialId: string
  materialReference: string
  materialName: string
  siteCode: string
  lotNumber: string
  supplierLot?: string
  supplier?: string
  certificateRef?: string
  certificateUrl?: string
  manufacturedAt?: Date
  expiryAt?: Date
  receivedAt: Date
  quantity: number
  remainingQty: number
  location?: string
  status: MaterialLotStatus
  notes?: string
}

export type PurchaseOrderStatus = 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrder {
  id: string
  poNumber: string
  materialId: string
  materialReference: string
  materialName: string
  siteCode: string
  supplier: string
  quantity: number
  receivedQty: number
  unitPrice?: number
  status: PurchaseOrderStatus
  expectedDate?: Date
  receivedDate?: Date
  notes?: string
  createdAt: Date
}

export interface CreatePurchaseOrderInput {
  materialReference: string
  supplier: string
  quantity: number
  unitPrice?: number
  expectedDate?: Date
  notes?: string
}

export interface CreateTransferInput {
  materialReference: string
  sourceSiteCode: string
  destSiteCode: string
  quantity: number
  reason?: string
  notes?: string
}

export interface CreateMaterialLotInput {
  materialReference: string
  lotNumber: string
  quantity: number
  supplierLot?: string
  supplier?: string
  certificateRef?: string
  certificateUrl?: string
  manufacturedAt?: Date
  expiryAt?: Date
  receivedAt?: Date
  location?: string
  notes?: string
}

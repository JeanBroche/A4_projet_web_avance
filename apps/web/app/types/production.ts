export type BomStatus = 'pending' | 'in_progress' | 'done'
export type BatchStatus = 'pending' | 'in_progress' | 'validated'
export type Priority = 'low' | 'normal' | 'high' | 'critical'

export interface BomItem {
  reference: string
  name: string
  /** Coefficient matière par unité de produit fini. */
  qtyPerUnit: number
  /** Besoin total (qtyPerUnit × quantité OF) — recalculé à l'affichage. */
  qtyNeeded: number
  qtyStock: number
  unit: string
}

export interface ManufacturingOrder {
  id: number
  name: string
  emoji: string
  ofNumber: string
  qty: number
  status: BomStatus
  priority: Priority
  bom: BomItem[]
}

export interface Batch {
  id: number
  lotNumber: string
  ofNumber: string
  bomCode: string
  productName: string
  emoji: string
  qty: number
  status: BatchStatus
  priority: Priority
  hasAnomaly: boolean
  progress: number
  createdAt: string
  bom: BomItem[]
}

export interface Product {
  id: string
  productCode: string
  description: string
  quantity: number
  reservedQuantity: number
  siteCode: string
}

export interface CreateManufacturingOrderInput {
  name: string
  ofNumber: string
  qty: number
  status: BomStatus
  priority: Priority
  emoji: string
  bom: BomItem[]
}

export interface UpdateBomOrderInput {
  id: number
  qty?: number
  bom: BomItem[]
}

export interface CreateBatchInput {
  ofNumber: string
  productName: string
  qty: number
  priority: Priority
  emoji: string
}

export interface CreateProductInput {
  productCode: string
  description: string
  quantity: number
  siteCode?: string
}

export interface UpdateProductInput {
  productCode: string
  description?: string
  quantity?: number
  siteCode?: string
}

export interface ReportAnomalyInput {
  batchId: number
  description: string
}

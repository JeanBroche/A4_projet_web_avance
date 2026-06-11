export type BomStatus = 'pending' | 'in_progress' | 'done'
export type BatchStatus = 'pending' | 'in_progress' | 'validated'
export type Priority = 'low' | 'normal' | 'high' | 'critical'

export interface BomItem {
  reference: string
  name: string
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
  hasBomAnomaly: boolean
  bom: BomItem[]
}

export interface Batch {
  id: number
  lotNumber: string
  productName: string
  emoji: string
  qty: number
  status: BatchStatus
  priority: Priority
  hasAnomaly: boolean
  createdAt: string
  bom: BomItem[]
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
  bom: BomItem[]
}

export interface CreateBatchInput {
  productName: string
  qty: number
  priority: Priority
  emoji: string
}

export interface ReportAnomalyInput {
  batchId: number
  description: string
}

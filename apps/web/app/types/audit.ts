export type ActivityType =
  | 'of_started'
  | 'of_completed'
  | 'of_paused'
  | 'anomaly'
  | 'stock_low'
  | 'stock_updated'
  | 'stock_reserved'
  | 'stock_released'
  | 'bom_validated'
  | 'login'

export interface Activity {
  id: number
  type: ActivityType
  title: string
  description: string
  /** Identifiant utilisateur (filtrage historique par compte). */
  userId?: string
  user: string
  date: Date
  meta?: string
}

export type LotTraceSource = 'production' | 'stock' | 'shipment' | 'audit'

export interface LotTraceEvent {
  id: string
  at: Date
  source: LotTraceSource
  title: string
  description: string
  actor?: string
}

export interface LotTraceTimeline {
  lotId: string
  lotNumber: string
  ofNumber: string
  productName: string
  events: LotTraceEvent[]
}

export interface LotDocument {
  id: string
  lotId: string
  filename: string
  contentType: string
  sizeBytes: number
  uploadedBy: string
  uploadedAt: string
}

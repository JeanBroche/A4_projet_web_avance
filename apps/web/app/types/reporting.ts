export interface MarginData {
  id: number
  ofNumber: string
  client: string
  product: string
  costPrice: number
  sellingPrice: number
  marginPercent: number
}

export interface CriticalIncident {
  id: string
  label: string
  detail: string
  severity: 'warning' | 'error'
}

export interface KpiDashboard {
  globalMargin: string
  delayedOrders: number
  bomAnomalies: number
  totalValue: string
  /** Taux de lots terminés / total (0–100) */
  yieldRate: number
  marginOrders: MarginData[]
  criticalIncidents: CriticalIncident[]
}

export interface MarginData {
  id: number
  ofNumber: string
  client: string
  product: string
  costPrice: number
  sellingPrice: number
  marginPercent: number
}

export type CriticalIncidentCategory = 'stock' | 'production' | 'audit'

export interface CriticalIncident {
  id: string
  label: string
  detail: string
  severity: 'warning' | 'error'
  category: CriticalIncidentCategory
  targetRoute?: string
  targetQuery?: Record<string, string>
}

export interface AtRiskMaterial {
  code: string
  siteCode?: string
  score: number
  estimatedDaysToRupture: number | null
}

export interface KpiDashboard {
  globalMargin: string
  totalValue: string
  estimatedDelayCost: string
  marginOrders: MarginData[]

  yieldRate: number
  averageProgress: number
  activeBatches: number
  lateBatches: number

  stockRuptures: number
  atRiskMaterials: AtRiskMaterial[]
  averageConsumptionPerDay: number

  urgentOrders: number
  delayRiskOrders: number

  criticalIncidents: CriticalIncident[]
  siteLabel?: string
}

export interface ReportingDashboardOptions {
  consolidated?: boolean
  siteCode?: string
}

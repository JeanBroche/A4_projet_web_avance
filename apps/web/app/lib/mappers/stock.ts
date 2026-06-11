import { toNumericId } from '~/lib/mappers/id'

type BackendLevel = {
  materialId: string
  code: string
  description?: string | null
  unit: string
  current: number
  reserved: number
  available: number
  minimum: number
}

type BackendReservation = {
  id: string
  ofId: string
  materialId: string
  quantity: number
  status: string
  createdAt: string | Date
  material?: { code?: string; description?: string | null; unit?: string }
}

type BackendDelay = {
  id: string
  materialId: string
  supplier: string
  expectedDate: string | Date
  actualDate?: string | Date | null
  notes?: string | null
  createdAt: string | Date
  material?: { code?: string; description?: string | null }
}

type BackendForecast = {
  materialCode?: string
  code?: string
  description?: string | null
  available?: number
  minimum?: number
  unit?: string
  riskScore?: number
  score?: number
  estimatedDaysUntilRupture?: number | null
  estimatedDaysToRupture?: number | null
}

const CATEGORY_EMOJI: Record<string, string> = {
  metal: '🔩',
  plastique: '🧱',
  electronique: '⚡',
  default: '📦'
}

export function mapMaterialToStockLevel(material: BackendLevel) {
  const category = material.description?.split(' ')[0]?.toLowerCase() ?? 'default'
  return {
    id: toNumericId(material.materialId),
    emoji: CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.default ?? '📦',
    name: material.description ?? material.code,
    reference: material.code,
    category,
    description: material.description ?? '',
    dimensions: '—',
    qty: material.current,
    reserved: material.reserved,
    available: material.available,
    unit: material.unit as 'pcs',
    minQty: material.minimum
  }
}

export function mapReservationToUi(reservation: BackendReservation) {
  return {
    id: toNumericId(reservation.id),
    ofId: reservation.ofId,
    materialId: reservation.materialId,
    materialName: reservation.material?.description ?? reservation.material?.code ?? reservation.materialId,
    quantity: reservation.quantity,
    unit: (reservation.material?.unit ?? 'pcs') as 'pcs',
    status: reservation.status as 'ACTIVE' | 'RELEASED' | 'CANCELLED',
    createdAt: new Date(reservation.createdAt)
  }
}

export function mapSupplierDelayToUi(delay: BackendDelay) {
  const expected = new Date(delay.expectedDate)
  const actual = delay.actualDate ? new Date(delay.actualDate) : new Date()
  const delayDays = Math.max(0, Math.round((actual.getTime() - expected.getTime()) / 86400000))
  return {
    id: delay.id,
    materialReference: delay.material?.code ?? delay.materialId,
    materialName: delay.material?.description ?? delay.material?.code ?? delay.materialId,
    supplier: delay.supplier,
    delayDays,
    reportedAt: new Date(delay.createdAt),
    comment: delay.notes ?? undefined
  }
}

export function mapForecastToUi(item: BackendForecast) {
  return {
    reference: item.materialCode ?? item.code ?? '—',
    name: item.description ?? item.materialCode ?? item.code ?? '—',
    available: item.available ?? 0,
    minQty: item.minimum ?? 0,
    unit: (item.unit ?? 'pcs') as 'pcs',
    score: item.riskScore ?? item.score ?? 0,
    estimatedDaysUntilRupture: item.estimatedDaysUntilRupture ?? item.estimatedDaysToRupture ?? null
  }
}

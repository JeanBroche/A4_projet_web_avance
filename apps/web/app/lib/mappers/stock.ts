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
  reserved?: number
  activeReservationQty?: number
  consumptionPerDay?: number
  riskScore?: number
  score?: number
  status?: string
  estimatedDaysUntilRupture?: number | null
  estimatedDaysToRupture?: number | null
}

type BackendConsolidated = {
  code: string
  description?: string | null
  unit: string
  current: number
  reserved: number
  available: number
  minimum: number
  sites: Array<{
    siteCode: string
    current: number
    reserved: number
    available: number
    minimum: number
  }>
}

type BackendPurchaseOrder = {
  id: string
  poNumber: string
  materialId: string
  siteCode: string
  supplier: string
  quantity: number
  receivedQty: number
  unitPrice?: number | null
  status: string
  expectedDate?: string | Date | null
  receivedDate?: string | Date | null
  notes?: string | null
  createdAt: string | Date
  material?: { code?: string; description?: string | null }
}

type BackendLot = {
  id: string
  materialId: string
  siteCode: string
  lotNumber: string
  supplierLot?: string | null
  supplier?: string | null
  certificateRef?: string | null
  certificateUrl?: string | null
  manufacturedAt?: string | Date | null
  expiryAt?: string | Date | null
  receivedAt: string | Date
  quantity: number
  remainingQty: number
  location?: string | null
  status: string
  notes?: string | null
  material?: { code?: string; description?: string | null }
}

type BackendMovement = {
  id: string
  materialId: string
  siteCode: string
  type: string
  quantity: number
  reason?: string | null
  documentRef?: string | null
  createdAt: string | Date
  material?: { code?: string; description?: string | null }
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
  const materialCode = reservation.material?.code ?? reservation.materialId
  return {
    id: toNumericId(reservation.id),
    ofId: reservation.ofId,
    materialId: materialCode,
    materialName: reservation.material?.description ?? materialCode,
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

export function mapConsolidatedToUi(item: BackendConsolidated) {
  return {
    reference: item.code,
    name: item.description ?? item.code,
    unit: (item.unit ?? 'pcs') as 'pcs',
    current: item.current,
    reserved: item.reserved,
    available: item.available,
    minimum: item.minimum,
    sites: item.sites.map(s => ({
      siteCode: s.siteCode,
      current: s.current,
      reserved: s.reserved,
      available: s.available,
      minimum: s.minimum
    }))
  }
}

export function mapPurchaseOrderToUi(order: BackendPurchaseOrder) {
  return {
    id: order.id,
    poNumber: order.poNumber,
    materialId: order.materialId,
    materialReference: order.material?.code ?? order.materialId,
    materialName: order.material?.description ?? order.material?.code ?? order.materialId,
    siteCode: order.siteCode,
    supplier: order.supplier,
    quantity: order.quantity,
    receivedQty: order.receivedQty,
    unitPrice: order.unitPrice ?? undefined,
    status: order.status as 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED',
    expectedDate: order.expectedDate ? new Date(order.expectedDate) : undefined,
    receivedDate: order.receivedDate ? new Date(order.receivedDate) : undefined,
    notes: order.notes ?? undefined,
    createdAt: new Date(order.createdAt)
  }
}

export function mapLotToUi(lot: BackendLot) {
  return {
    id: lot.id,
    materialId: lot.materialId,
    materialReference: lot.material?.code ?? lot.materialId,
    materialName: lot.material?.description ?? lot.material?.code ?? lot.materialId,
    siteCode: lot.siteCode,
    lotNumber: lot.lotNumber,
    supplierLot: lot.supplierLot ?? undefined,
    supplier: lot.supplier ?? undefined,
    certificateRef: lot.certificateRef ?? undefined,
    certificateUrl: lot.certificateUrl ?? undefined,
    manufacturedAt: lot.manufacturedAt ? new Date(lot.manufacturedAt) : undefined,
    expiryAt: lot.expiryAt ? new Date(lot.expiryAt) : undefined,
    receivedAt: new Date(lot.receivedAt),
    quantity: lot.quantity,
    remainingQty: lot.remainingQty,
    location: lot.location ?? undefined,
    status: lot.status as 'ACTIVE' | 'EXHAUSTED' | 'QUARANTINE' | 'EXPIRED',
    notes: lot.notes ?? undefined
  }
}

export function mapMovementToUi(movement: BackendMovement) {
  const documentRef = movement.documentRef ?? undefined
  const base = documentRef?.split('::')[0]
  const ofId = base && (base.startsWith('BATCH-') || base.startsWith('OF-')) ? base : undefined
  return {
    id: movement.id,
    materialId: movement.materialId,
    materialReference: movement.material?.code ?? movement.materialId,
    siteCode: movement.siteCode,
    type: movement.type as 'IN' | 'OUT' | 'ADJUST',
    quantity: movement.quantity,
    reason: movement.reason ?? undefined,
    documentRef,
    ofId,
    createdAt: new Date(movement.createdAt)
  }
}

export function mapForecastToUi(item: BackendForecast) {
  const status = item.status
  const normalizedStatus =
    status === 'rupture' || status === 'critical' || status === 'warning' || status === 'ok'
      ? status
      : (item.available ?? 0) <= 0
        ? 'rupture'
        : (item.score ?? 0) >= 80
          ? 'critical'
          : (item.score ?? 0) >= 50
            ? 'warning'
            : 'ok'

  return {
    reference: item.materialCode ?? item.code ?? '—',
    name: item.description ?? item.materialCode ?? item.code ?? '—',
    available: item.available ?? 0,
    minQty: item.minimum ?? 0,
    unit: (item.unit ?? 'pcs') as 'pcs',
    reserved: item.reserved ?? 0,
    activeReservationQty: item.activeReservationQty ?? 0,
    consumptionPerDay: item.consumptionPerDay ?? 0,
    score: item.riskScore ?? item.score ?? 0,
    status: normalizedStatus,
    estimatedDaysUntilRupture: item.estimatedDaysUntilRupture ?? item.estimatedDaysToRupture ?? null
  }
}

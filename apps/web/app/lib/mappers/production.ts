import { SEED_BOM_UI, SEED_MATERIAL_LABELS } from '@aeronexis/shared'
import { computeBomNeed, normalizeQtyPerUnit } from '~/lib/bom-utils'
import { toNumericId } from '~/lib/mappers/id'
import type { Priority } from '~/types'

type BackendBom = {
  id: string
  bom_code: string
  description?: string | null
  quantity?: number
  status?: string
  priority?: string
  lines?: Array<{ material_id: string; quantity: number }>
}

type BackendProduct = {
  id: string
  productCode: string
  description?: string | null
  quantity: number
  reservedQuantity?: number
  siteCode: string
}

type BackendBomLine = {
  material_id: string
  quantity: number
}

type BackendBatchBom = {
  description?: string | null
  bom_code?: string
  quantity?: number
  priority?: string
  lines?: BackendBomLine[]
}

type BackendBatch = {
  batch_id: string
  batch_code: string
  bom_id?: string
  bom_code?: string
  bom_codes?: string[]
  command_id?: string
  status?: string
  progress?: number
  hasAnomaly?: boolean
  createdAt?: string | Date
  bom?: BackendBatchBom
}

const BOM_STATUS: Record<string, 'pending' | 'in_progress' | 'done'> = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'done',
  CANCELLED: 'done'
}

const BATCH_STATUS: Record<string, 'pending' | 'in_progress' | 'validated'> = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'validated',
  CANCELLED: 'pending'
}

const UI_BOM_STATUS: Record<string, string> = {
  pending: 'PENDING',
  in_progress: 'IN_PROGRESS',
  done: 'COMPLETED'
}

const UI_BATCH_STATUS: Record<string, string> = {
  pending: 'PENDING',
  in_progress: 'IN_PROGRESS',
  validated: 'COMPLETED'
}

export function mapBomStatusToUi(status?: string) {
  return BOM_STATUS[status ?? 'PENDING'] ?? 'pending'
}

export function mapBatchStatusToUi(status?: string) {
  return BATCH_STATUS[status ?? 'PENDING'] ?? 'pending'
}

export function mapUiBomStatus(status: string) {
  return UI_BOM_STATUS[status] ?? status.toUpperCase()
}

export function mapUiBatchStatus(status: string) {
  return UI_BATCH_STATUS[status] ?? status.toUpperCase()
}

function materialLabel(materialId: string) {
  return SEED_MATERIAL_LABELS[materialId as keyof typeof SEED_MATERIAL_LABELS]
}

function bomUiMeta(bomCode: string) {
  return SEED_BOM_UI[bomCode]
}

function bomEmoji(bomCode: string) {
  return bomUiMeta(bomCode)?.emoji ?? '🏭'
}

function bomPriority(bomCode: string, stored?: string | null): Priority {
  const fromDb = stored as Priority | undefined
  if (fromDb && ['low', 'normal', 'high', 'critical'].includes(fromDb)) return fromDb
  return bomUiMeta(bomCode)?.priority ?? 'normal'
}

function mapBomLinesToUi(
  lines: BackendBomLine[],
  orderQty: number,
  fallback?: { reference: string; name: string }
) {
  const mapped = lines.map((line) => {
    const label = materialLabel(line.material_id)
    const qtyPerUnit = normalizeQtyPerUnit(line.quantity)
    return {
      reference: line.material_id,
      name: label?.name ?? line.material_id,
      qtyPerUnit,
      qtyNeeded: computeBomNeed(qtyPerUnit, orderQty),
      qtyStock: 0,
      unit: label?.unit ?? 'pcs'
    }
  })
  if (mapped.length) return mapped
  if (!fallback) return []
  return [{
    reference: fallback.reference,
    name: fallback.name,
    qtyPerUnit: 1,
    qtyNeeded: orderQty,
    qtyStock: 0,
    unit: 'pcs'
  }]
}

export function mapBomToUi(bom: BackendBom) {
  const orderQty = bom.quantity ?? 1
  return {
    id: toNumericId(bom.id),
    name: bom.description ?? bom.bom_code,
    emoji: bomEmoji(bom.bom_code),
    ofNumber: bom.bom_code,
    qty: orderQty,
    status: mapBomStatusToUi(bom.status),
    priority: bomPriority(bom.bom_code, bom.priority),
    bom: mapBomLinesToUi(bom.lines ?? [], orderQty, {
      reference: bom.bom_code,
      name: bom.description ?? bom.bom_code
    })
  }
}

export function mapBatchToUi(batch: BackendBatch) {
  const primary = batch.bom_code ?? batch.bom?.bom_code ?? ''
  const bomCodes = batch.bom_codes?.length
    ? [...batch.bom_codes]
    : primary
      ? [primary]
      : []
  const orderQty = batch.bom?.quantity ?? 1
  const bomCode = batch.bom_code ?? batch.bom?.bom_code ?? ''
  return {
    id: toNumericId(batch.batch_id),
    lotNumber: batch.batch_code,
    ofNumber: batch.command_id ?? primary ?? batch.batch_code,
    bomCode: primary,
    bomCodes,
    productName: batch.bom?.description ?? batch.batch_code,
    emoji: bomEmoji(bomCode),
    qty: orderQty,
    status: mapBatchStatusToUi(batch.status),
    priority: bomPriority(bomCode, batch.bom?.priority),
    hasAnomaly: batch.hasAnomaly ?? false,
    progress: batch.progress ?? 0,
    createdAt: batch.createdAt
      ? new Date(batch.createdAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    bom: []
  }
}

export function mapProductToUi(product: BackendProduct) {
  return {
    id: product.id,
    productCode: product.productCode,
    description: product.description ?? product.productCode,
    quantity: product.quantity,
    reservedQuantity: product.reservedQuantity ?? 0,
    siteCode: product.siteCode
  }
}

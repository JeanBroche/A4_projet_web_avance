import { SEED_BOM_UI, SEED_MATERIAL_LABELS } from '@aeronexis/shared'
import { toNumericId } from '~/lib/mappers/id'
import type { Priority } from '~/types'

type BackendBom = {
  id: string
  bom_code: string
  description?: string | null
  quantity?: number
  status?: string
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

type BackendBatch = {
  batch_id: string
  batch_code: string
  bom_id?: string
  bom_code?: string
  command_id?: string
  status?: string
  progress?: number
  hasAnomaly?: boolean
  createdAt?: string | Date
  bom?: { description?: string | null; bom_code?: string }
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

function bomPriority(bomCode: string): Priority {
  return bomUiMeta(bomCode)?.priority ?? 'normal'
}

export function mapBomToUi(bom: BackendBom) {
  const lines = (bom.lines ?? []).map((line) => {
    const label = materialLabel(line.material_id)
    return {
      reference: line.material_id,
      name: label?.name ?? line.material_id,
      qtyNeeded: line.quantity,
      qtyStock: 0,
      unit: label?.unit ?? 'pcs'
    }
  })
  return {
    id: toNumericId(bom.id),
    name: bom.description ?? bom.bom_code,
    emoji: bomEmoji(bom.bom_code),
    ofNumber: bom.bom_code,
    qty: bom.quantity ?? 1,
    status: mapBomStatusToUi(bom.status),
    priority: bomPriority(bom.bom_code),
    bom: lines.length
      ? lines
      : [{ reference: bom.bom_code, name: bom.description ?? bom.bom_code, qtyNeeded: bom.quantity ?? 1, qtyStock: 0, unit: 'pcs' }]
  }
}

export function mapBatchToUi(batch: BackendBatch) {
  return {
    id: toNumericId(batch.batch_id),
    lotNumber: batch.batch_code,
    ofNumber: batch.command_id ?? batch.batch_code,
    bomCode: batch.bom_code ?? batch.bom?.bom_code ?? '',
    productName: batch.bom?.description ?? batch.batch_code,
    emoji: bomEmoji(batch.bom_code ?? batch.bom?.bom_code ?? ''),
    qty: 1,
    status: mapBatchStatusToUi(batch.status),
    priority: bomPriority(batch.bom_code ?? batch.bom?.bom_code ?? ''),
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

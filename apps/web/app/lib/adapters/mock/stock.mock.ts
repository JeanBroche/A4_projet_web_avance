import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity } from '~/lib/adapters/mock/audit-store'
import { getMockActorName } from '~/lib/adapters/mock/mock-actor'
import {
  createMockReservations,
  listMockReservations,
  seedMockReservations,
  transitionMockReservation,
  updateMockReservationQuantity
} from '~/lib/adapters/mock/reservation-store'
import { CATEGORY_EMOJI, createInitialParts } from '~/fixtures/stock/parts'
import { createInitialReservations } from '~/fixtures/stock/reservations'
import type { StockAdapter } from '~/lib/adapters/types'
import { ApiClientError } from '~/lib/api/envelope'
import {
  addMockSupplierDelay,
  getMockSupplierDelays
} from '~/lib/adapters/mock/supplier-delay-store'
import type {
  CreateMaterialLotInput,
  CreatePurchaseOrderInput,
  CreateStockLevelInput,
  MaterialLot,
  MaterialLotStatus,
  PurchaseOrder,
  PurchaseOrderStatus,
  RuptureForecast,
  StockLevel,
  StockMovement,
  StockMovementType,
  SupplierDelayInput
} from '~/types'

let partsStore: StockLevel[] = createInitialParts()
let nextPartId = 11
let movementsStore: StockMovement[] = []
let movementSeq = 1
let lotsStore: MaterialLot[] = []
let lotSeq = 1
let poStore: PurchaseOrder[] = []
let poSeq = 1

seedMockReservations(createInitialReservations())

function recordMovement(input: {
  reference: string
  type: StockMovementType
  quantity: number
  reason?: string
  documentRef?: string
  ofId?: string
}) {
  const part = partsStore.find(p => p.reference === input.reference)
  if (!part) return
  const movement: StockMovement = {
    id: `mock-mov-${movementSeq++}`,
    materialId: String(part.id),
    materialReference: part.reference,
    siteCode: 'SITE-LYO',
    type: input.type,
    quantity: input.quantity,
    reason: input.reason,
    documentRef: input.documentRef,
    ofId: input.ofId,
    createdAt: new Date()
  }
  movementsStore = [movement, ...movementsStore].slice(0, 500)
}

function syncLevel(part: Omit<StockLevel, 'available'>): StockLevel {
  return { ...part, available: Math.max(0, part.qty - part.reserved) }
}

function setPartReserved(reference: string, delta: number) {
  const idx = partsStore.findIndex(p => p.reference === reference)
  if (idx === -1) return
  const part = partsStore[idx]!
  const reserved = Math.max(0, part.reserved + delta)
  partsStore[idx] = syncLevel({ ...part, reserved })
}

const reservationDeps = {
  getParts: () => partsStore,
  setPartReserved
}

export function getMockStockLevels(): StockLevel[] {
  return partsStore
}

function toApiError(error: unknown): never {
  if (error instanceof Error) {
    throw new ApiClientError('VALIDATION_ERROR', error.message)
  }
  throw error
}

export function createMockStockAdapter(): StockAdapter {
  return {
    async listLevels() {
      await simulateDelay()
      return partsStore.map(syncLevel)
    },

    async createLevel(input: CreateStockLevelInput) {
      await simulateDelay()
      const part = syncLevel({
        id: nextPartId++,
        emoji: CATEGORY_EMOJI[input.category] ?? '📦',
        ...input,
        dimensions: input.dimensions || '—',
        reserved: 0
      })
      partsStore.unshift(part)
      appendMockActivity({
        type: 'stock_updated',
        title: 'Stock mis à jour',
        description: `Référence ${part.reference} ajoutée au stock (${part.qty} ${part.unit}).`,
        user: getMockActorName(),
        meta: part.reference
      })
      return part
    },

    async updateLevel(id: number, qty: number) {
      await simulateDelay()
      const idx = partsStore.findIndex(p => p.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Pièce introuvable')
      const current = partsStore[idx]!
      const delta = qty - current.qty
      partsStore[idx] = syncLevel({ ...current, qty })
      const part = partsStore[idx]!
      if (delta !== 0) {
        recordMovement({
          reference: part.reference,
          type: delta > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(delta),
          reason: 'Ajustement stock'
        })
      }
      const activityType = qty === 0 ? 'stock_low' : qty < part.minQty ? 'stock_low' : 'stock_updated'
      appendMockActivity({
        type: activityType,
        title: activityType === 'stock_low' ? 'Alerte stock' : 'Stock mis à jour',
        description: `${part.reference} : ${qty} ${part.unit} en stock.`,
        user: getMockActorName(),
        meta: part.reference
      })
      return part
    },

    async deleteLevel(id: number) {
      await simulateDelay()
      partsStore = partsStore.filter(p => p.id !== id)
    },

    async listReservations(ofId?: string) {
      await simulateDelay(80)
      return listMockReservations(ofId)
    },

    async createReservation(input) {
      await simulateDelay()
      try {
        const created = createMockReservations(input, reservationDeps)
        const refs = created.map(r => r.materialId).join(', ')
        appendMockActivity({
          type: 'stock_reserved',
          title: 'Matières réservées',
          description: `${created.length} ligne(s) réservée(s) pour l'OF (${refs}).`,
          user: getMockActorName(),
          meta: input.ofId
        })
        return created
      } catch (e) {
        toApiError(e)
      }
    },

    async updateReservation(id: number, qty: number) {
      await simulateDelay()
      try {
        return updateMockReservationQuantity(id, qty, reservationDeps)
      } catch (e) {
        toApiError(e)
      }
    },

    async releaseReservation(id: number) {
      await simulateDelay()
      try {
        const updated = transitionMockReservation(id, 'RELEASED', reservationDeps)
        appendMockActivity({
          type: 'stock_released',
          title: 'Réservation libérée',
          description: `${updated.materialName} (${updated.quantity} ${updated.unit}) libéré pour ${updated.ofId}.`,
          user: getMockActorName(),
          meta: updated.ofId
        })
        return updated
      } catch (e) {
        toApiError(e)
      }
    },

    async cancelReservation(id: number) {
      await simulateDelay()
      try {
        const updated = transitionMockReservation(id, 'CANCELLED', reservationDeps)
        appendMockActivity({
          type: 'stock_released',
          title: 'Réservation annulée',
          description: `${updated.materialName} (${updated.quantity} ${updated.unit}) annulé pour ${updated.ofId}.`,
          user: getMockActorName(),
          meta: updated.ofId
        })
        return updated
      } catch (e) {
        toApiError(e)
      }
    },

    async getRuptureForecast() {
      await simulateDelay(80)
      const windowDays = 30
      const windowStart = Date.now() - windowDays * 86400000
      const forecasts: RuptureForecast[] = partsStore.map((p) => {
        const totalOut = movementsStore
          .filter(m =>
            m.materialReference === p.reference
            && m.type === 'OUT'
            && m.createdAt.getTime() >= windowStart
          )
          .reduce((sum, m) => sum + m.quantity, 0)
        const activeReservationQty = listMockReservations()
          .filter(r => r.materialId === p.reference && r.status === 'ACTIVE')
          .reduce((sum, r) => sum + r.quantity, 0)
        const historicalDaily = totalOut / windowDays
        const reservationDaily = activeReservationQty > 0 ? activeReservationQty / 7 : 0
        const consumptionPerDay = Math.round(Math.max(historicalDaily, reservationDaily) * 100) / 100

        let score = 0
        let status: RuptureForecast['status'] = 'ok'
        let estimatedDaysUntilRupture: number | null = null

        if (p.available <= 0) {
          score = 100
          status = 'rupture'
          estimatedDaysUntilRupture = 0
        } else if (consumptionPerDay <= 0) {
          if (p.available < p.minQty) {
            const ratio = p.available / Math.max(p.minQty, 1)
            score = Math.min(100, Math.round(40 + (1 - ratio) * 60))
            status = score >= 70 ? 'critical' : 'warning'
          }
        } else {
          const daysToRupture = p.available / consumptionPerDay
          const windowRatio = 1 - daysToRupture / windowDays
          score = Math.min(100, Math.max(0, Math.round(windowRatio * 100)))
          if (p.available < p.minQty) {
            score = Math.min(100, score + Math.round((1 - p.available / Math.max(p.minQty, 1)) * 25))
          }
          estimatedDaysUntilRupture = Math.round(daysToRupture * 10) / 10
          if (score >= 80 || daysToRupture <= 3) status = 'critical'
          else if (score >= 50 || daysToRupture <= windowDays / 2) status = 'warning'
        }

        return {
          reference: p.reference,
          name: p.name,
          available: p.available,
          minQty: p.minQty,
          unit: p.unit,
          reserved: p.reserved,
          activeReservationQty,
          consumptionPerDay,
          score,
          status,
          estimatedDaysUntilRupture
        }
      })
      return forecasts.sort((a, b) => b.score - a.score)
    },

    async reportSupplierDelay(input: SupplierDelayInput) {
      await simulateDelay()
      const part = partsStore.find(p => p.reference === input.materialReference)
      if (!part) throw new ApiClientError('NOT_FOUND', 'Référence introuvable')
      const delay = addMockSupplierDelay(input, part.name)
      appendMockActivity({
        type: 'stock_low',
        title: 'Retard fournisseur',
        description: `${part.name} — ${input.supplier} (+${input.delayDays} j)`,
        user: getMockActorName(),
        meta: part.reference
      })
      return delay
    },

    async listSupplierDelays() {
      await simulateDelay(60)
      return getMockSupplierDelays()
    },

    async listConsolidatedLevels() {
      await simulateDelay()
      return partsStore.map(p => ({
        reference: p.reference,
        name: p.name,
        unit: p.unit,
        current: p.qty,
        reserved: p.reserved,
        available: p.available,
        minimum: p.minQty,
        sites: [{
          siteCode: 'SITE-LYO',
          current: p.qty,
          reserved: p.reserved,
          available: p.available,
          minimum: p.minQty
        }]
      }))
    },

    async listAlerts() {
      await simulateDelay(60)
      return partsStore
        .filter(p => p.available < p.minQty)
        .map(p => ({
          id: `alert-${p.reference}`,
          materialCode: p.reference,
          materialName: p.name,
          severity: p.available === 0 ? 'critical' as const : 'warning' as const,
          message: p.available === 0 ? 'Rupture de stock' : 'Stock sous le seuil minimum'
        }))
    },

    async listMovements(filters) {
      await simulateDelay(80)
      let items = movementsStore
      if (filters?.materialReference) {
        items = items.filter(m => m.materialReference === filters.materialReference)
      }
      if (filters?.limit) {
        items = items.slice(0, filters.limit)
      }
      return items
    },

    async listLots(filters) {
      await simulateDelay(80)
      let items = lotsStore
      if (filters?.materialReference) {
        items = items.filter(l => l.materialReference === filters.materialReference)
      }
      if (filters?.status) {
        items = items.filter(l => l.status === filters.status)
      }
      return items
    },

    async createLot(input: CreateMaterialLotInput) {
      await simulateDelay()
      const part = partsStore.find(p => p.reference === input.materialReference)
      if (!part) throw new ApiClientError('NOT_FOUND', 'Référence introuvable')
      const lot: MaterialLot = {
        id: `mock-lot-${lotSeq++}`,
        materialId: String(part.id),
        materialReference: part.reference,
        materialName: part.name,
        siteCode: 'SITE-LYO',
        lotNumber: input.lotNumber,
        supplierLot: input.supplierLot,
        supplier: input.supplier,
        certificateRef: input.certificateRef,
        certificateUrl: input.certificateUrl,
        manufacturedAt: input.manufacturedAt,
        expiryAt: input.expiryAt,
        receivedAt: input.receivedAt ?? new Date(),
        quantity: input.quantity,
        remainingQty: input.quantity,
        location: input.location,
        status: 'ACTIVE',
        notes: input.notes
      }
      lotsStore = [lot, ...lotsStore]
      partsStore = partsStore.map(p => p.reference === part.reference
        ? syncLevel({ ...p, qty: p.qty + input.quantity })
        : p)
      recordMovement({
        reference: part.reference,
        type: 'IN',
        quantity: input.quantity,
        reason: `Réception lot ${input.lotNumber}`,
        documentRef: `LOT::${lot.id}`
      })
      appendMockActivity({
        type: 'stock_updated',
        title: 'Réception lot',
        description: `${part.reference} : lot ${input.lotNumber} (${input.quantity} ${part.unit}) réceptionné.`,
        user: getMockActorName(),
        meta: part.reference
      })
      return lot
    },

    async updateLotStatus(id: string, status: MaterialLotStatus) {
      await simulateDelay()
      const idx = lotsStore.findIndex(l => l.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Lot introuvable')
      lotsStore[idx] = { ...lotsStore[idx]!, status }
      return lotsStore[idx]!
    },

    async transferStock(input) {
      await simulateDelay()
      const part = partsStore.find(p => p.reference === input.materialReference)
      if (!part) throw new ApiClientError('NOT_FOUND', 'Référence introuvable')
      if (part.available < input.quantity) {
        throw new ApiClientError('INSUFFICIENT_STOCK', `Stock insuffisant : disponible ${part.available}`)
      }
      const ref = `TRANSFER::${part.reference}::${input.sourceSiteCode}->${input.destSiteCode}::${Date.now()}`
      partsStore = partsStore.map(p => p.reference === part.reference
        ? syncLevel({ ...p, qty: p.qty - input.quantity })
        : p)
      recordMovement({
        reference: part.reference,
        type: 'OUT',
        quantity: input.quantity,
        reason: input.reason ?? `Transfert ${input.sourceSiteCode} → ${input.destSiteCode}`,
        documentRef: ref
      })
      appendMockActivity({
        type: 'stock_updated',
        title: 'Transfert inter-sites',
        description: `${part.reference} : ${input.quantity} ${part.unit} de ${input.sourceSiteCode} vers ${input.destSiteCode}.`,
        user: getMockActorName(),
        meta: part.reference
      })
      return { transferRef: ref }
    },

    async listPurchaseOrders(filters) {
      await simulateDelay(80)
      let items = poStore
      if (filters?.status) items = items.filter(o => o.status === filters.status)
      if (filters?.materialReference) items = items.filter(o => o.materialReference === filters.materialReference)
      return items
    },

    async createPurchaseOrder(input: CreatePurchaseOrderInput) {
      await simulateDelay()
      const part = partsStore.find(p => p.reference === input.materialReference)
      if (!part) throw new ApiClientError('NOT_FOUND', 'Référence introuvable')
      const order: PurchaseOrder = {
        id: `mock-po-${poSeq}`,
        poNumber: `PO-MOCK-${String(poSeq++).padStart(4, '0')}`,
        materialId: String(part.id),
        materialReference: part.reference,
        materialName: part.name,
        siteCode: 'SITE-LYO',
        supplier: input.supplier,
        quantity: input.quantity,
        receivedQty: 0,
        unitPrice: input.unitPrice,
        status: 'ORDERED',
        expectedDate: input.expectedDate,
        notes: input.notes,
        createdAt: new Date()
      }
      poStore = [order, ...poStore]
      appendMockActivity({
        type: 'stock_updated',
        title: 'Commande achat créée',
        description: `${order.poNumber} : ${input.quantity} ${part.unit} de ${part.reference} (${input.supplier}).`,
        user: getMockActorName(),
        meta: part.reference
      })
      return order
    },

    async receivePurchaseOrder(id: string, receivedQty: number) {
      await simulateDelay()
      const idx = poStore.findIndex(o => o.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Commande introuvable')
      const order = poStore[idx]!
      const remaining = order.quantity - order.receivedQty
      if (receivedQty > remaining) {
        throw new ApiClientError('VALIDATION_ERROR', `Quantité reçue trop élevée (reste ${remaining})`)
      }
      const newReceived = order.receivedQty + receivedQty
      const status: PurchaseOrderStatus = newReceived >= order.quantity ? 'RECEIVED' : 'PARTIAL'
      const updated: PurchaseOrder = {
        ...order,
        receivedQty: newReceived,
        status,
        receivedDate: status === 'RECEIVED' ? new Date() : order.receivedDate
      }
      poStore[idx] = updated
      const part = partsStore.find(p => p.reference === order.materialReference)
      if (part) {
        partsStore = partsStore.map(p => p.reference === part.reference
          ? syncLevel({ ...p, qty: p.qty + receivedQty })
          : p)
        recordMovement({
          reference: part.reference,
          type: 'IN',
          quantity: receivedQty,
          reason: `Réception PO ${order.poNumber}`,
          documentRef: `PO::${order.poNumber}`
        })
      }
      return updated
    }
  }
}

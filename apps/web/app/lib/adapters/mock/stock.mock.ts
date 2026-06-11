import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity } from '~/lib/adapters/mock/audit-store'
import { getMockActorName } from '~/lib/adapters/mock/mock-actor'
import {
  createMockReservations,
  listMockReservations,
  seedMockReservations,
  transitionMockReservation
} from '~/lib/adapters/mock/reservation-store'
import { CATEGORY_EMOJI, createInitialParts } from '~/fixtures/stock/parts'
import { createInitialReservations } from '~/fixtures/stock/reservations'
import { createInitialReturned } from '~/fixtures/stock/returned'
import type { StockAdapter } from '~/lib/adapters/types'
import { ApiClientError } from '~/lib/api/envelope'
import {
  addMockSupplierDelay,
  getMockSupplierDelays
} from '~/lib/adapters/mock/supplier-delay-store'
import type {
  CreateReturnItemInput,
  CreateStockLevelInput,
  ReturnItem,
  RuptureForecast,
  StockLevel,
  SupplierDelayInput
} from '~/types'

let partsStore: StockLevel[] = createInitialParts()
let returnedStore: ReturnItem[] = createInitialReturned()
let nextPartId = 11
let nextReturnId = 7

seedMockReservations(createInitialReservations())

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

function formatDate(): string {
  return new Date().toLocaleDateString('fr-FR')
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
      partsStore[idx] = syncLevel({ ...current, qty })
      const part = partsStore[idx]!
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

    async listReturned() {
      await simulateDelay()
      return [...returnedStore]
    },

    async createReturned(input: CreateReturnItemInput) {
      await simulateDelay()
      const item: ReturnItem = {
        id: nextReturnId++,
        emoji: '📦',
        name: input.name,
        reference: input.reference,
        qty: input.qty,
        state: input.state,
        reason: input.reason,
        date: formatDate(),
        of: input.of
      }
      returnedStore.unshift(item)
      return item
    },

    async updateReturned(id: number, qty: number, state: ReturnItem['state']) {
      await simulateDelay()
      const idx = returnedStore.findIndex(i => i.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Article retourné introuvable')
      returnedStore[idx] = { ...returnedStore[idx]!, qty, state }
      return returnedStore[idx]!
    },

    async deleteReturned(id: number) {
      await simulateDelay()
      returnedStore = returnedStore.filter(i => i.id !== id)
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
      const forecasts: RuptureForecast[] = partsStore.map((p) => {
        const ratio = p.minQty > 0 ? p.available / p.minQty : p.available > 0 ? 2 : 0
        let score = 0
        if (p.available === 0) score = 100
        else if (ratio < 0.5) score = 85
        else if (ratio < 1) score = 60
        else if (ratio < 1.5) score = 30
        else score = 10
        const dailyUse = Math.max(1, Math.ceil(p.minQty / 14))
        const estimatedDaysUntilRupture =
          p.available === 0 ? 0 : Math.max(1, Math.floor(p.available / dailyUse))
        return {
          reference: p.reference,
          name: p.name,
          available: p.available,
          minQty: p.minQty,
          unit: p.unit,
          score,
          estimatedDaysUntilRupture: p.available === 0 ? 0 : estimatedDaysUntilRupture
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
    }
  }
}

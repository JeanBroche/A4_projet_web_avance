import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity } from '~/lib/adapters/mock/audit-store'
import { getMockActorName } from '~/lib/adapters/mock/mock-actor'
import { createInitialBatches } from '~/fixtures/production/batches'
import { createInitialBomOrders } from '~/fixtures/production/bom'
import { createInitialProducts } from '~/fixtures/production/products'
import type { ProductionAdapter } from '~/lib/adapters/types'
import { getMockStockLevels } from '~/lib/adapters/mock/stock.mock'
import type { Batch, BatchStatus, BomItem, CreateBatchInput, CreateManufacturingOrderInput, CreateProductInput, ManufacturingOrder, Product, UpdateProductInput } from '~/types'
import { ApiClientError } from '~/lib/api/envelope'

const bomStore: ManufacturingOrder[] = createInitialBomOrders()
const batchStore: Batch[] = createInitialBatches()
let productStore: Product[] = createInitialProducts()
let nextBomId = 7
let nextBatchId = 3
let nextLotNum = 3

function stockAvailable(reference: string, fallback: number): number {
  const level = getMockStockLevels().find(p => p.reference === reference)
  return level?.available ?? fallback
}

function syncBomStock(bom: BomItem[]): BomItem[] {
  return bom.map(item => ({
    ...item,
    qtyStock: stockAvailable(item.reference, item.qtyStock)
  }))
}

export function getMockBomOrders(): ManufacturingOrder[] {
  return bomStore
}

export function getMockBatches(): Batch[] {
  return batchStore
}

export function getMockProducts(): Product[] {
  return productStore
}

export function createMockProductionAdapter(): ProductionAdapter {
  return {
    async listBomOrders() {
      await simulateDelay()
      return [...bomStore]
    },

    async createBomOrder(input: CreateManufacturingOrderInput) {
      await simulateDelay()
      const bom = syncBomStock(input.bom)
      const order: ManufacturingOrder = {
        id: nextBomId++,
        ...input,
        bom
      }
      bomStore.unshift(order)
      appendMockActivity({
        type: 'bom_validated',
        title: 'OF créé',
        description: `Nouvel ordre de fabrication : ${order.name}.`,
        user: getMockActorName(),
        meta: order.ofNumber
      })
      return order
    },

    async updateBomOrder(input) {
      await simulateDelay()
      const idx = bomStore.findIndex(o => o.id === input.id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'OF introuvable')
      const bom = syncBomStock(input.bom)
      bomStore[idx] = { ...bomStore[idx]!, bom }
      const order = bomStore[idx]!
      appendMockActivity({
        type: 'bom_validated',
        title: 'BOM mise à jour',
        description: `Nomenclature de ${order.ofNumber} modifiée (${bom.length} ligne(s)).`,
        user: getMockActorName(),
        meta: order.ofNumber
      })
      return order
    },

    async updateBomOrderStatus(id: number, status: ManufacturingOrder['status']) {
      await simulateDelay()
      const idx = bomStore.findIndex(o => o.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'OF introuvable')
      bomStore[idx] = { ...bomStore[idx]!, status }
      const order = bomStore[idx]!
      const type = status === 'done' ? 'of_completed' : status === 'in_progress' ? 'of_started' : 'of_paused'
      appendMockActivity({
        type,
        title: status === 'done' ? 'OF terminé' : status === 'in_progress' ? 'OF démarré' : 'OF en attente',
        description: `Statut de ${order.ofNumber} mis à jour.`,
        user: getMockActorName(),
        meta: order.ofNumber
      })
      return order
    },

    async listBatches() {
      await simulateDelay()
      return [...batchStore]
    },

    async createBatch(input: CreateBatchInput) {
      await simulateDelay()
      const ofOrder = bomStore.find(o => o.ofNumber === input.ofNumber)
      if (!ofOrder) throw new ApiClientError('NOT_FOUND', `OF introuvable : ${input.ofNumber}`)
      const bom = syncBomStock(ofOrder.bom.map(item => ({ ...item })))
      const batch: Batch = {
        id: nextBatchId++,
        lotNumber: `LOT-24-${String(nextLotNum++).padStart(3, '0')}`,
        ofNumber: input.ofNumber,
        productName: input.productName,
        emoji: input.emoji,
        qty: input.qty,
        status: 'pending',
        priority: input.priority,
        hasAnomaly: false,
        createdAt: new Date().toISOString().slice(0, 10),
        bom
      }
      batchStore.unshift(batch)
      appendMockActivity({
        type: 'of_started',
        title: 'Lot ordonnancé',
        description: `Création du lot ${batch.lotNumber} pour ${input.ofNumber} — ${batch.productName}.`,
        user: getMockActorName(),
        meta: batch.lotNumber
      })
      return batch
    },

    async updateBatchStatus(id: number, status: BatchStatus) {
      await simulateDelay()
      const idx = batchStore.findIndex(b => b.id === id)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Lot introuvable')
      batchStore[idx] = { ...batchStore[idx]!, status }
      const batch = batchStore[idx]!
      appendMockActivity({
        type: status === 'validated' ? 'of_completed' : 'of_started',
        title: 'Avancement lot',
        description: `Lot ${batch.lotNumber} : statut ${status}.`,
        user: getMockActorName(),
        meta: batch.lotNumber
      })
      return batch
    },

    async reportAnomaly(input) {
      await simulateDelay()
      const idx = batchStore.findIndex(b => b.id === input.batchId)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Lot introuvable')
      batchStore[idx] = { ...batchStore[idx]!, hasAnomaly: true }
      const batch = batchStore[idx]!
      appendMockActivity({
        type: 'anomaly',
        title: 'Anomalie signalée',
        description: input.description,
        user: getMockActorName(),
        meta: batch.lotNumber
      })
      return batch
    },

    async clearAnomaly(batchId) {
      await simulateDelay()
      const idx = batchStore.findIndex(b => b.id === batchId)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Lot introuvable')
      batchStore[idx] = { ...batchStore[idx]!, hasAnomaly: false }
      return batchStore[idx]!
    },

    async listProducts() {
      await simulateDelay()
      return [...productStore]
    },

    async getProduct(productCode) {
      await simulateDelay()
      const product = productStore.find(p => p.productCode === productCode)
      if (!product) throw new ApiClientError('NOT_FOUND', 'Produit introuvable')
      return product
    },

    async createProduct(input: CreateProductInput) {
      await simulateDelay()
      const product: Product = {
        id: `prod-${Date.now()}`,
        productCode: input.productCode,
        description: input.description,
        quantity: input.quantity,
        reservedQuantity: 0,
        siteCode: input.siteCode ?? 'SITE-LYO'
      }
      productStore.unshift(product)
      return product
    },

    async updateProduct(input: UpdateProductInput) {
      await simulateDelay()
      const idx = productStore.findIndex(p => p.productCode === input.productCode)
      if (idx === -1) throw new ApiClientError('NOT_FOUND', 'Produit introuvable')
      productStore[idx] = {
        ...productStore[idx]!,
        description: input.description ?? productStore[idx]!.description,
        quantity: input.quantity ?? productStore[idx]!.quantity,
        siteCode: input.siteCode ?? productStore[idx]!.siteCode
      }
      return productStore[idx]!
    },

    async deleteProduct(productCode) {
      await simulateDelay()
      productStore = productStore.filter(p => p.productCode !== productCode)
    }
  }
}

import { syncNotificationsAfterMutation } from '~/lib/notifications-sync'
import { toFailureResult } from '~/lib/api/envelope'
import type {
  AsyncStatus,
  Batch,
  BatchStatus,
  CreateBatchInput,
  CreateManufacturingOrderInput,
  CreateProductInput,
  ManufacturingOrder,
  Product,
  UpdateBomOrderInput,
  UpdateProductInput
} from '~/types'

export function useProduction() {
  const adapters = useAdapters()

  const bomOrders = ref<ManufacturingOrder[]>([])
  const batches = ref<Batch[]>([])
  const products = ref<Product[]>([])
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const isMutating = ref(false)

  async function refreshBom() {
    status.value = 'pending'
    error.value = null
    try {
      bomOrders.value = await adapters.production.listBomOrders()
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  async function refreshBatches() {
    status.value = 'pending'
    error.value = null
    try {
      batches.value = await adapters.production.listBatches()
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  async function refreshProducts() {
    status.value = 'pending'
    error.value = null
    try {
      products.value = await adapters.production.listProducts()
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  async function createBomOrder(input: CreateManufacturingOrderInput) {
    isMutating.value = true
    try {
      await adapters.production.createBomOrder(input)
      await refreshBom()
    } finally {
      isMutating.value = false
    }
  }

  async function updateBomOrder(input: UpdateBomOrderInput) {
    isMutating.value = true
    try {
      await adapters.production.updateBomOrder(input)
      await refreshBom()
    } finally {
      isMutating.value = false
    }
  }

  async function updateBomOrderStatus(id: number, status: ManufacturingOrder['status']) {
    isMutating.value = true
    try {
      await adapters.production.updateBomOrderStatus(id, status)
      await refreshBom()
    } finally {
      isMutating.value = false
    }
  }

  async function updateBomOrderPriority(id: number, priority: ManufacturingOrder['priority']) {
    isMutating.value = true
    try {
      await adapters.production.updateBomOrderPriority(id, priority)
      await refreshBom()
    } finally {
      isMutating.value = false
    }
  }

  async function updateBomOrderQuantity(id: number, qty: number) {
    isMutating.value = true
    try {
      await adapters.production.updateBomOrderQuantity(id, qty)
      await refreshBom()
    } finally {
      isMutating.value = false
    }
  }

  async function createBatch(input: CreateBatchInput) {
    isMutating.value = true
    try {
      await adapters.production.createBatch(input)
      await refreshBatches()
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function updateBatchStatus(id: number, batchStatus: BatchStatus) {
    isMutating.value = true
    try {
      await adapters.production.updateBatchStatus(id, batchStatus)
      await refreshBatches()
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function reportAnomaly(batchId: number, description: string) {
    isMutating.value = true
    try {
      await adapters.production.reportAnomaly({ batchId, description })
      await refreshBatches()
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function clearAnomaly(batchId: number) {
    isMutating.value = true
    try {
      await adapters.production.clearAnomaly(batchId)
      await refreshBatches()
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function createProduct(input: CreateProductInput) {
    isMutating.value = true
    try {
      await adapters.production.createProduct(input)
      await refreshProducts()
    } finally {
      isMutating.value = false
    }
  }

  async function updateProduct(input: UpdateProductInput) {
    isMutating.value = true
    try {
      await adapters.production.updateProduct(input)
      await refreshProducts()
    } finally {
      isMutating.value = false
    }
  }

  async function deleteProduct(productCode: string) {
    isMutating.value = true
    try {
      await adapters.production.deleteProduct(productCode)
      await refreshProducts()
    } finally {
      isMutating.value = false
    }
  }

  return {
    bomOrders,
    batches,
    products,
    status,
    error,
    isMutating,
    refreshBom,
    refreshBatches,
    refreshProducts,
    createBomOrder,
    updateBomOrder,
    updateBomOrderStatus,
    updateBomOrderPriority,
    updateBomOrderQuantity,
    createBatch,
    updateBatchStatus,
    reportAnomaly,
    clearAnomaly,
    createProduct,
    updateProduct,
    deleteProduct
  }
}

import { syncNotificationsAfterMutation } from '~/lib/notifications-sync'
import { toFailureResult } from '~/lib/api/envelope'
import type {
  AsyncStatus,
  Batch,
  BatchStatus,
  CreateBatchInput,
  CreateManufacturingOrderInput,
  ManufacturingOrder,
  UpdateBomOrderInput
} from '~/types'

export function useProduction() {
  const adapters = useAdapters()

  const bomOrders = ref<ManufacturingOrder[]>([])
  const batches = ref<Batch[]>([])
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

  async function reportBomAnomaly(bomOrderId: number, description: string) {
    isMutating.value = true
    try {
      await adapters.production.reportBomAnomaly({ bomOrderId, description })
      await refreshBom()
    } finally {
      isMutating.value = false
    }
  }

  return {
    bomOrders,
    batches,
    status,
    error,
    isMutating,
    refreshBom,
    refreshBatches,
    createBomOrder,
    updateBomOrder,
    updateBomOrderStatus,
    createBatch,
    updateBatchStatus,
    reportAnomaly,
    clearAnomaly,
    reportBomAnomaly
  }
}

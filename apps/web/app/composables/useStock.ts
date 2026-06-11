import { toFailureResult } from '~/lib/api/envelope'
import type {
  AsyncStatus,
  CreateReservationInput,
  CreateReturnItemInput,
  CreateStockLevelInput,
  ReturnItem,
  StockLevel,
  StockReservation
} from '~/types'

export function useStock() {
  const adapters = useAdapters()

  const levels = ref<StockLevel[]>([])
  const returned = ref<ReturnItem[]>([])
  const reservations = ref<StockReservation[]>([])
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const isMutating = ref(false)

  async function refresh() {
    status.value = 'pending'
    error.value = null
    try {
      const [levelsData, returnedData, reservationsData] = await Promise.all([
        adapters.stock.listLevels(),
        adapters.stock.listReturned(),
        adapters.stock.listReservations()
      ])
      levels.value = levelsData
      returned.value = returnedData
      reservations.value = reservationsData
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  async function refreshLevels() {
    status.value = 'pending'
    error.value = null
    try {
      levels.value = await adapters.stock.listLevels()
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  async function refreshReservations() {
    try {
      reservations.value = await adapters.stock.listReservations()
    } catch (e) {
      error.value = toFailureResult(e).message
    }
  }

  async function fetchReservationsForOf(ofId: string) {
    const list = await adapters.stock.listReservations(ofId)
    return list.filter(r => r.status === 'ACTIVE')
  }

  async function refreshReturned() {
    status.value = 'pending'
    error.value = null
    try {
      returned.value = await adapters.stock.listReturned()
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  function activeReservationsFor(ofId: string) {
    return reservations.value.filter(r => r.ofId === ofId && r.status === 'ACTIVE')
  }

  function hasActiveReservations(ofId: string) {
    return activeReservationsFor(ofId).length > 0
  }

  function levelByReference(reference: string) {
    return levels.value.find(l => l.reference === reference)
  }

  async function createLevel(input: CreateStockLevelInput) {
    isMutating.value = true
    try {
      await adapters.stock.createLevel(input)
      await refreshLevels()
    } finally {
      isMutating.value = false
    }
  }

  async function updateLevel(id: number, qty: number) {
    isMutating.value = true
    try {
      await adapters.stock.updateLevel(id, qty)
      await refreshLevels()
    } finally {
      isMutating.value = false
    }
  }

  async function deleteLevel(id: number) {
    isMutating.value = true
    try {
      await adapters.stock.deleteLevel(id)
      await refreshLevels()
    } finally {
      isMutating.value = false
    }
  }

  async function createReturned(input: CreateReturnItemInput) {
    isMutating.value = true
    try {
      await adapters.stock.createReturned(input)
      await refreshReturned()
    } finally {
      isMutating.value = false
    }
  }

  async function updateReturned(id: number, qty: number, state: ReturnItem['state']) {
    isMutating.value = true
    try {
      await adapters.stock.updateReturned(id, qty, state)
      await refreshReturned()
    } finally {
      isMutating.value = false
    }
  }

  async function deleteReturned(id: number) {
    isMutating.value = true
    try {
      await adapters.stock.deleteReturned(id)
      await refreshReturned()
    } finally {
      isMutating.value = false
    }
  }

  async function createReservation(input: CreateReservationInput) {
    isMutating.value = true
    error.value = null
    try {
      await adapters.stock.createReservation(input)
      await Promise.all([refreshLevels(), refreshReservations()])
    } catch (e) {
      error.value = toFailureResult(e).message
      throw e
    } finally {
      isMutating.value = false
    }
  }

  async function releaseReservation(id: number) {
    isMutating.value = true
    error.value = null
    try {
      await adapters.stock.releaseReservation(id)
      await Promise.all([refreshLevels(), refreshReservations()])
    } catch (e) {
      error.value = toFailureResult(e).message
      throw e
    } finally {
      isMutating.value = false
    }
  }

  async function cancelReservation(id: number) {
    isMutating.value = true
    error.value = null
    try {
      await adapters.stock.cancelReservation(id)
      await Promise.all([refreshLevels(), refreshReservations()])
    } catch (e) {
      error.value = toFailureResult(e).message
      throw e
    } finally {
      isMutating.value = false
    }
  }

  return {
    levels,
    returned,
    reservations,
    status,
    error,
    isMutating,
    refresh,
    refreshLevels,
    refreshReservations,
    fetchReservationsForOf,
    refreshReturned,
    activeReservationsFor,
    hasActiveReservations,
    levelByReference,
    createLevel,
    updateLevel,
    deleteLevel,
    createReturned,
    updateReturned,
    deleteReturned,
    createReservation,
    releaseReservation,
    cancelReservation
  }
}

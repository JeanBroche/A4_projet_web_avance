import { syncNotificationsAfterMutation } from '~/lib/notifications-sync'
import { toFailureResult } from '~/lib/api/envelope'
import type { StockAlert } from '~/lib/adapters/types'
import type {
  AsyncStatus,
  CreateReservationInput,
  CreateStockLevelInput,
  RuptureForecast,
  StockLevel,
  StockReservation,
  SupplierDelay,
  SupplierDelayInput
} from '~/types'

export function useStock() {
  const adapters = useAdapters()

  const levels = ref<StockLevel[]>([])
  const reservations = ref<StockReservation[]>([])
  const alerts = ref<StockAlert[]>([])
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const isMutating = ref(false)
  const ruptureForecast = ref<RuptureForecast[]>([])
  const supplierDelays = ref<SupplierDelay[]>([])

  async function refreshRuptureForecast() {
    try {
      ruptureForecast.value = await adapters.stock.getRuptureForecast()
    } catch {
      ruptureForecast.value = []
    }
  }

  async function refreshSupplierDelays() {
    try {
      supplierDelays.value = await adapters.stock.listSupplierDelays()
    } catch {
      supplierDelays.value = []
    }
  }

  async function refreshAlerts() {
    try {
      alerts.value = await adapters.stock.listAlerts()
    } catch {
      alerts.value = []
    }
  }

  async function refresh() {
    status.value = 'pending'
    error.value = null
    try {
      const [levelsData, reservationsData] = await Promise.all([
        adapters.stock.listLevels(),
        adapters.stock.listReservations()
      ])
      levels.value = levelsData
      reservations.value = reservationsData
      await Promise.all([refreshAlerts(), refreshRuptureForecast(), refreshSupplierDelays()])
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
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function updateLevel(id: number, qty: number) {
    isMutating.value = true
    try {
      await adapters.stock.updateLevel(id, qty)
      await refreshLevels()
      await syncNotificationsAfterMutation()
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

  async function createReservation(input: CreateReservationInput) {
    isMutating.value = true
    error.value = null
    try {
      await adapters.stock.createReservation(input)
      await Promise.all([refreshLevels(), refreshReservations()])
      await syncNotificationsAfterMutation()
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
      await syncNotificationsAfterMutation()
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
      await syncNotificationsAfterMutation()
    } catch (e) {
      error.value = toFailureResult(e).message
      throw e
    } finally {
      isMutating.value = false
    }
  }

  async function reportSupplierDelay(input: SupplierDelayInput) {
    isMutating.value = true
    error.value = null
    try {
      const delay = await adapters.stock.reportSupplierDelay(input)
      await Promise.all([refreshSupplierDelays(), refreshRuptureForecast()])
      await syncNotificationsAfterMutation()
      return delay
    } catch (e) {
      error.value = toFailureResult(e).message
      throw e
    } finally {
      isMutating.value = false
    }
  }

  return {
    levels,
    reservations,
    alerts,
    status,
    error,
    isMutating,
    refresh,
    refreshLevels,
    refreshReservations,
    refreshAlerts,
    fetchReservationsForOf,
    activeReservationsFor,
    hasActiveReservations,
    levelByReference,
    createLevel,
    updateLevel,
    deleteLevel,
    createReservation,
    releaseReservation,
    cancelReservation,
    ruptureForecast,
    supplierDelays,
    refreshRuptureForecast,
    refreshSupplierDelays,
    reportSupplierDelay
  }
}

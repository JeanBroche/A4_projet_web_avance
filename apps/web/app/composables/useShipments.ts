import { syncNotificationsAfterMutation } from '~/lib/notifications-sync'
import { toFailureResult } from '~/lib/api/envelope'
import type { AsyncStatus, CreateShipmentInput, DeliveryStatus, Shipment, UpdateShipmentInput } from '~/types'

export function useShipments() {
  const adapters = useAdapters()

  const shipments = ref<Shipment[]>([])
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const isMutating = ref(false)

  async function refresh() {
    status.value = 'pending'
    error.value = null
    try {
      shipments.value = await adapters.shipment.list()
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  async function create(input: CreateShipmentInput) {
    isMutating.value = true
    try {
      await adapters.shipment.create(input)
      await refresh()
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function update(id: number, input: UpdateShipmentInput, backendId?: string) {
    isMutating.value = true
    error.value = null
    try {
      await adapters.shipment.update(id, input, backendId)
      await refresh()
      await syncNotificationsAfterMutation()
    } catch (e) {
      const failure = toFailureResult(e)
      error.value = failure.message
      throw e
    } finally {
      isMutating.value = false
    }
  }

  async function updateStatus(id: number, shipmentStatus: DeliveryStatus, backendId?: string) {
    isMutating.value = true
    error.value = null
    try {
      await adapters.shipment.updateStatus(id, shipmentStatus, backendId)
      await refresh()
      await syncNotificationsAfterMutation()
    } catch (e) {
      const failure = toFailureResult(e)
      error.value = failure.message
      throw e
    } finally {
      isMutating.value = false
    }
  }

  return { shipments, status, error, isMutating, refresh, create, update, updateStatus }
}

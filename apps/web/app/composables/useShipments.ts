import { toFailureResult } from '~/lib/api/envelope'
import type { AsyncStatus, CreateShipmentInput, DeliveryStatus, Shipment } from '~/types'

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
    } finally {
      isMutating.value = false
    }
  }

  async function updateStatus(id: number, shipmentStatus: DeliveryStatus) {
    isMutating.value = true
    try {
      await adapters.shipment.updateStatus(id, shipmentStatus)
      await refresh()
    } finally {
      isMutating.value = false
    }
  }

  return { shipments, status, error, isMutating, refresh, create, updateStatus }
}

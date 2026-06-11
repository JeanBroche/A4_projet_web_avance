import { toFailureResult } from '~/lib/api/envelope'
import type { AsyncStatus, CreateOrderInput, Order, OrderPriority, OrderStatus } from '~/types'

export function useOrders() {
  const adapters = useAdapters()

  const orders = ref<Order[]>([])
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const isMutating = ref(false)

  async function refresh() {
    status.value = 'pending'
    error.value = null
    try {
      orders.value = await adapters.order.list()
      status.value = 'success'
    } catch (e) {
      const failure = toFailureResult(e)
      status.value = 'failure'
      error.value = failure.message
    }
  }

  async function create(input: CreateOrderInput) {
    isMutating.value = true
    try {
      await adapters.order.create(input)
      await refresh()
    } finally {
      isMutating.value = false
    }
  }

  async function updateStatus(id: number, orderStatus: OrderStatus) {
    isMutating.value = true
    try {
      await adapters.order.updateStatus(id, orderStatus)
      await refresh()
    } finally {
      isMutating.value = false
    }
  }

  async function validate(id: number) {
    isMutating.value = true
    try {
      await adapters.order.validate(id)
      await refresh()
    } finally {
      isMutating.value = false
    }
  }

  async function reject(id: number) {
    isMutating.value = true
    try {
      await adapters.order.reject(id)
      await refresh()
    } finally {
      isMutating.value = false
    }
  }

  async function changePriority(id: number, priority: OrderPriority) {
    isMutating.value = true
    try {
      await adapters.order.changePriority(id, priority)
      await refresh()
    } finally {
      isMutating.value = false
    }
  }

  async function reportAnomaly(id: number) {
    isMutating.value = true
    try {
      await adapters.order.reportAnomaly(id)
      await refresh()
    } finally {
      isMutating.value = false
    }
  }

  async function clearAnomaly(id: number) {
    isMutating.value = true
    try {
      await adapters.order.clearAnomaly(id)
      await refresh()
    } finally {
      isMutating.value = false
    }
  }

  return {
    orders,
    status,
    error,
    isMutating,
    refresh,
    create,
    updateStatus,
    validate,
    reject,
    changePriority,
    reportAnomaly,
    clearAnomaly
  }
}

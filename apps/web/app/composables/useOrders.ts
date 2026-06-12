import { syncNotificationsAfterMutation } from '~/lib/notifications-sync'
import { toFailureResult } from '~/lib/api/envelope'
import type {
  AsyncStatus,
  ClientStats,
  CreateOrderInput,
  Order,
  OrderHistoryEntry,
  OrderPriority,
  OrderStatus
} from '~/types'

export function useOrders() {
  const adapters = useAdapters()

  const orders = ref<Order[]>([])
  const status = ref<AsyncStatus>('idle')
  const error = ref<string | null>(null)
  const mutationError = ref<string | null>(null)
  const isMutating = ref(false)
  const clientStats = ref<ClientStats | null>(null)
  const orderHistory = ref<OrderHistoryEntry[]>([])

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
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function updateStatus(id: number, orderStatus: OrderStatus) {
    isMutating.value = true
    mutationError.value = null
    try {
      await adapters.order.updateStatus(id, orderStatus)
      await refresh()
      await syncNotificationsAfterMutation()
    } catch (e) {
      mutationError.value = toFailureResult(e).message
    } finally {
      isMutating.value = false
    }
  }

  async function validate(id: number) {
    isMutating.value = true
    try {
      await adapters.order.validate(id)
      await refresh()
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function reject(id: number) {
    isMutating.value = true
    try {
      await adapters.order.reject(id)
      await refresh()
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function changePriority(id: number, priority: OrderPriority) {
    isMutating.value = true
    try {
      await adapters.order.changePriority(id, priority)
      await refresh()
      await syncNotificationsAfterMutation()
    } finally {
      isMutating.value = false
    }
  }

  async function loadClientStats(client: string) {
    try {
      clientStats.value = await adapters.order.getClientStats(client)
    } catch {
      clientStats.value = null
    }
  }

  async function loadOrderHistory(orderId: number) {
    try {
      orderHistory.value = await adapters.order.getOrderHistory(orderId)
    } catch {
      orderHistory.value = []
    }
  }

  return {
    orders,
    status,
    error,
    mutationError,
    isMutating,
    clientStats,
    orderHistory,
    refresh,
    create,
    updateStatus,
    validate,
    reject,
    changePriority,
    loadClientStats,
    loadOrderHistory
  }
}

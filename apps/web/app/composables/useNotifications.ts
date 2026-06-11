import type { AppNotification } from '~/types'

export function useNotifications() {
  const readIds = useState<string[]>('notifications:read', () => [])
  const adapters = useAdapters()
  const { canViewNotifications } = useRoleCapabilities()
  const config = useRuntimeConfig()
  const isMock = computed(() => config.public.apiAdapter === 'mock')

  const liveNotifications = ref<AppNotification[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'failure'>('idle')
  const serverUnreadCount = ref<number | null>(null)

  async function refresh() {
    if (!canViewNotifications.value) {
      liveNotifications.value = []
      serverUnreadCount.value = 0
      return
    }
    status.value = 'pending'
    try {
      const [list, unread] = await Promise.all([
        adapters.notification.list(),
        adapters.notification.unreadCount()
      ])
      liveNotifications.value = list
      serverUnreadCount.value = unread
      status.value = 'success'
    } catch {
      liveNotifications.value = []
      serverUnreadCount.value = null
      status.value = 'failure'
    }
  }

  const notifications = computed(() => {
    if (!isMock.value) return liveNotifications.value
    return liveNotifications.value.map(n => ({
      ...n,
      read: readIds.value.includes(n.id) || n.read
    }))
  })

  const unreadCount = computed(() => {
    if (!isMock.value && serverUnreadCount.value !== null) {
      return serverUnreadCount.value
    }
    return notifications.value.filter(n => !n.read).length
  })

  async function markAsRead(id: string) {
    if (isMock.value) {
      if (!readIds.value.includes(id)) {
        readIds.value = [...readIds.value, id]
      }
      return
    }
    await adapters.notification.markAsRead(id)
    const item = liveNotifications.value.find(n => n.id === id)
    if (item) item.read = true
    if (serverUnreadCount.value !== null && serverUnreadCount.value > 0) {
      serverUnreadCount.value -= 1
    }
  }

  async function markAllAsRead() {
    if (isMock.value) {
      readIds.value = notifications.value.map(n => n.id)
      return
    }
    const unread = liveNotifications.value.filter(n => !n.read)
    await Promise.all(unread.map(n => adapters.notification.markAsRead(n.id)))
    for (const n of liveNotifications.value) n.read = true
    serverUnreadCount.value = 0
  }

  return { notifications, unreadCount, status, markAsRead, markAllAsRead, refresh }
}

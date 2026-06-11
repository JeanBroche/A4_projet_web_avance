import type { AppNotification } from '~/types'

const readIds = useState<string[]>('notifications:read', () => [])

export function useNotifications() {
  const adapters = useAdapters()
  const { canViewNotifications } = useRoleCapabilities()

  const liveNotifications = ref<AppNotification[]>([])
  const status = ref<'idle' | 'pending' | 'success' | 'failure'>('idle')

  async function refresh() {
    if (!canViewNotifications.value) {
      liveNotifications.value = []
      return
    }
    status.value = 'pending'
    try {
      const list = await adapters.notification.list()
      liveNotifications.value = list
      status.value = 'success'
    } catch {
      liveNotifications.value = []
      status.value = 'failure'
    }
  }

  const notifications = computed(() =>
    liveNotifications.value.map(n => ({
      ...n,
      read: readIds.value.includes(n.id)
    }))
  )

  const unreadCount = computed(() =>
    notifications.value.filter(n => !n.read).length
  )

  function markAsRead(id: string) {
    if (!readIds.value.includes(id)) {
      readIds.value = [...readIds.value, id]
    }
  }

  function markAllAsRead() {
    readIds.value = notifications.value.map(n => n.id)
  }

  return { notifications, unreadCount, status, markAsRead, markAllAsRead, refresh }
}

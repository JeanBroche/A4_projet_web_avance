import { useApiClient } from '~/lib/api/client'
import type { NotificationAdapter } from '~/lib/adapters/types'
import { mapNotificationToUi } from '~/lib/mappers/notification'

export function createMoleculerNotificationAdapter(getToken: () => string | null): NotificationAdapter {
  const { request } = useApiClient()

  return {
    async list() {
      const result = await request<{ items: Array<Parameters<typeof mapNotificationToUi>[0]> }>(
        '/notifications',
        { accessToken: getToken() }
      )
      return (result.items ?? []).map(mapNotificationToUi)
    },

    async markAsRead(id) {
      await request(`/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        accessToken: getToken()
      })
    },

    async unreadCount() {
      const result = await request<{ unreadCount?: number }>(
        '/notifications/unread-count',
        { accessToken: getToken() }
      )
      return result.unreadCount ?? 0
    }
  }
}

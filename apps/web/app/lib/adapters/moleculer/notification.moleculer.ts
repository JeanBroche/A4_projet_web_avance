import { useApiClient } from '~/lib/api/client'
import type { NotificationAdapter } from '~/lib/adapters/types'

export function createMoleculerNotificationAdapter(getToken: () => string | null): NotificationAdapter {
  const { request } = useApiClient()
  return {
    list() {
      return request('/notifications', { accessToken: getToken() })
    }
  }
}

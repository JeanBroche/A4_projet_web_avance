import { useApiClient } from '~/lib/api/client'
import type { AuthAdapter } from '~/lib/adapters/types'
import { mapAuthUser, mapLoginResult } from '~/lib/mappers/auth'
import type { LoginCredentials } from '~/types'

export function createMoleculerAuthAdapter(): AuthAdapter {
  const { request } = useApiClient()

  return {
    async login(credentials: LoginCredentials) {
      const data = await request<Parameters<typeof mapLoginResult>[0]>('/auth/login', {
        method: 'POST',
        body: credentials
      })
      return mapLoginResult(data)
    },

    async refresh() {
      const data = await request<Parameters<typeof mapLoginResult>[0]>('/auth/refresh', {
        method: 'POST'
      })
      return mapLoginResult(data)
    },

    async logout() {
      await request('/auth/logout', { method: 'POST' })
    },

    async me() {
      const data = await request<{
        user: {
          id: string
          email: string
          firstName?: string | null
          lastName?: string | null
          siteCode?: string | null
          roles?: Array<{ code: string, label?: string }>
        }
        roles?: Array<{ code: string, label?: string }>
      }>('/auth/me')
      return mapAuthUser(data.user, data.roles)
    }
  }
}

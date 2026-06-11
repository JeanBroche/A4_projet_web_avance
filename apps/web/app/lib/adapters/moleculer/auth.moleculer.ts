import { useApiClient } from '~/lib/api/client'
import type { AuthAdapter } from '~/lib/adapters/types'
import { mapAuthUser, mapLoginResult } from '~/lib/mappers/auth'
import type { LoginCredentials, User } from '~/types'

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

    async refresh(refreshToken: string) {
      const data = await request<Parameters<typeof mapLoginResult>[0]>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken }
      })
      return mapLoginResult(data)
    },

    async logout(refreshToken: string, accessToken?: string | null) {
      await request('/auth/logout', {
        method: 'POST',
        body: { refreshToken, ...(accessToken ? { accessToken } : {}) }
      })
    },

    async me(accessToken: string) {
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
      }>('/auth/me', { accessToken })
      return mapAuthUser(data.user, data.roles)
    }
  }
}

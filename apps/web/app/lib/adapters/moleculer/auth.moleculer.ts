/**
 * Adapter Moleculer — Auth
 * Routes gateway prévues (issue #5) :
 *   POST /api/auth/login    → auth.login
 *   POST /api/auth/refresh  → auth.refresh
 *   POST /api/auth/logout   → auth.logout
 *   GET  /api/auth/me       → auth.me
 */
import { useApiClient } from '~/lib/api/client'
import type { AuthAdapter } from '~/lib/adapters/types'
import type { LoginCredentials } from '~/types'

export function createMoleculerAuthAdapter(): AuthAdapter {
  const { request } = useApiClient()

  return {
    login(credentials: LoginCredentials) {
      return request('/auth/login', { method: 'POST', body: credentials })
    },

    logout(refreshToken: string) {
      return request('/auth/logout', { method: 'POST', body: { refreshToken } })
    },

    me(accessToken: string) {
      return request('/auth/me', { accessToken })
    }
  }
}

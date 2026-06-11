/**
 * Adapter Moleculer — Auth
 * Routes gateway prévues (issue #5) :
 *   POST /api/v1/auth/login    → auth.login
 *   POST /api/v1/auth/refresh  → auth.refresh
 *   POST /api/v1/auth/logout   → auth.logout
 *   GET  /api/v1/auth/me       → auth.me
 */
import { useApiClient } from '~/lib/api/client'
import type { AuthAdapter } from '~/lib/adapters/types'
import type { LoginCredentials } from '~/types'

export function createMoleculerAuthAdapter(): AuthAdapter {
  const { request } = useApiClient()

  return {
    login(credentials: LoginCredentials) {
      return request('/v1/auth/login', { method: 'POST', body: credentials })
    },

    logout(refreshToken: string) {
      return request('/v1/auth/logout', { method: 'POST', body: { refreshToken } })
    },

    me(accessToken: string) {
      return request('/v1/auth/me', { accessToken })
    }
  }
}

import { simulateDelay } from '~/lib/api/client'
import { appendMockActivity } from '~/lib/adapters/mock/audit-store'
import {
  createMockTokens,
  findMockAccount,
  findMockUserByToken,
  switchMockRole
} from '~/fixtures/auth/users'
import type { AuthAdapter } from '~/lib/adapters/types'
import type { LoginCredentials, UserRole } from '~/types'
import { ApiClientError } from '~/lib/api/envelope'

const activeSessions = new Map<string, string>()

export function createMockAuthAdapter(): AuthAdapter {
  return {
    async login(credentials: LoginCredentials) {
      await simulateDelay()
      const account = findMockAccount(credentials.email, credentials.password)
      if (!account) {
        throw new ApiClientError('AUTH_INVALID_CREDENTIALS', 'Email ou mot de passe incorrect')
      }
      const tokens = createMockTokens(account.user.id)
      activeSessions.set(tokens.refreshToken, account.user.id)
      appendMockActivity({
        type: 'login',
        title: 'Connexion',
        description: `Connexion au système (${account.user.role}).`,
        userId: account.user.id,
        user: account.user.name
      })
      return { ...tokens, user: account.user }
    },

    async logout(refreshToken: string) {
      await simulateDelay(150)
      activeSessions.delete(refreshToken)
    },

    async me(accessToken: string) {
      await simulateDelay(150)
      const user = findMockUserByToken(accessToken)
      if (!user) {
        throw new ApiClientError('AUTH_UNAUTHORIZED', 'Session invalide ou expirée')
      }
      return user
    },

    async switchRole(userId: string, role: UserRole) {
      await simulateDelay(150)
      const user = switchMockRole(userId, role)
      if (!user) {
        throw new ApiClientError('AUTH_USER_NOT_FOUND', 'Utilisateur introuvable')
      }
      return user
    }
  }
}

import { getDefaultRouteForRole } from '~/lib/roles'
import { toFailureResult } from '~/lib/api/envelope'
import type { LoginCredentials, UserRole } from '~/types'

export function useAuth() {
  const adapters = useAdapters()
  const { session, persist, clear } = useSessionState()
  const { isAuthenticated } = useSession()
  const config = useRuntimeConfig()
  const isMock = computed(() => config.public.apiAdapter === 'mock')

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function login(credentials: LoginCredentials) {
    isLoading.value = true
    error.value = null
    try {
      const result = await adapters.auth.login(credentials)
      if (isMock.value) {
        persist({
          user: result.user,
          accessToken: result.accessToken ?? null,
          refreshToken: result.refreshToken ?? null
        })
      } else {
        persist({ user: result.user })
      }
      return result
    } catch (e) {
      const failure = toFailureResult(e)
      error.value = failure.message
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function refreshSession() {
    if (isMock.value) {
      const refreshToken = session.value.refreshToken
      if (!refreshToken) {
        clear()
        return false
      }
      try {
        const result = await adapters.auth.refresh(refreshToken)
        persist({
          user: result.user,
          accessToken: result.accessToken ?? null,
          refreshToken: result.refreshToken ?? null
        })
        return true
      } catch {
        clear()
        return false
      }
    }

    try {
      const result = await adapters.auth.refresh()
      persist({ user: result.user })
      return true
    } catch {
      clear()
      return false
    }
  }

  async function restoreSession() {
    if (isMock.value) {
      if (!session.value.accessToken && !session.value.refreshToken) return

      if (session.value.accessToken) {
        try {
          const user = await adapters.auth.me(session.value.accessToken)
          persist({
            ...session.value,
            user
          })
          return
        } catch {
          // token expired — try refresh
        }
      }

      await refreshSession()
      return
    }

    if (session.value.user) return

    try {
      const user = await adapters.auth.me()
      persist({ user })
    } catch {
      await refreshSession()
    }
  }

  async function logout() {
    try {
      if (isMock.value) {
        await adapters.auth.logout(
          session.value.refreshToken ?? undefined,
          session.value.accessToken
        )
      } else {
        await adapters.auth.logout()
      }
    } catch {
      // ignore logout errors
    }
    clear()
    await navigateTo('/')
  }

  async function switchRole(role: UserRole) {
    if (!isMock.value || !adapters.auth.switchRole) return
    const userId = session.value.user?.id
    if (!userId) return
    const user = await adapters.auth.switchRole(userId, role)
    persist({
      ...session.value,
      user
    })
    await navigateTo(getDefaultRouteForRole(role))
  }

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshSession,
    restoreSession,
    switchRole
  }
}

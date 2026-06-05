export type UserRole = 'guest' | 'production' | 'logistique' | 'commercial' | 'direction' | 'admin'

export interface SessionUser {
  id: string | null
  name: string | null
  role: UserRole
}

/**
 * Stub de session en attendant l'authentification (issue #11).
 */
export function useSession() {
  const user = ref<SessionUser>({
    id: null,
    name: null,
    role: 'guest'
  })

  const isAuthenticated = computed(() => user.value.id !== null)

  return {
    user: readonly(user),
    isAuthenticated
  }
}

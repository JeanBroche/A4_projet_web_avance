import { getRoleLabel } from '~/lib/roles'
import type { UserRole } from '~/types'

export function useSession() {
  const { session } = useSessionState()

  const user = computed(() => session.value.user)
  const isAuthenticated = computed(() => session.value.user !== null)
  const role = computed(() => session.value.user?.role ?? null)
  const roleLabel = computed(() => (role.value ? getRoleLabel(role.value) : null))
  const accessToken = computed(() => session.value.accessToken)

  function hasRole(...roles: UserRole[]): boolean {
    if (!role.value) return false
    return roles.includes(role.value) || role.value === 'admin'
  }

  return {
    user,
    isAuthenticated,
    role,
    roleLabel,
    accessToken,
    hasRole
  }
}

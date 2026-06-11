import { canAccessRoute, getDefaultRouteForRole } from '~/lib/roles'

const PUBLIC_ROUTES = ['/']

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, role } = useSession()

  if (PUBLIC_ROUTES.includes(to.path)) {
    if (isAuthenticated.value && role.value) {
      return navigateTo(getDefaultRouteForRole(role.value))
    }
    return
  }

  if (!isAuthenticated.value) {
    return navigateTo('/')
  }

  if (role.value && !canAccessRoute(role.value, to.path)) {
    return navigateTo('/activity')
  }
})

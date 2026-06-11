import type { UserRole } from '~/types'

export interface RoleConfig {
  code: UserRole
  label: string
  icon: string
  defaultRoute: string
}

export const ROLES: RoleConfig[] = [
  { code: 'operateur', label: 'Opérateur Production', icon: 'i-hugeicons-drill', defaultRoute: '/batch' },
  { code: 'logistique', label: 'Responsable Logistique', icon: 'i-boxicons-package', defaultRoute: '/inventaire/spare' },
  { code: 'commercial', label: 'Responsable Commercial', icon: 'i-icon-park-solid-delivery', defaultRoute: '/commands' },
  { code: 'direction', label: 'Direction', icon: 'i-lucide-briefcase', defaultRoute: '/dashboard' },
  { code: 'admin', label: 'Administrateur', icon: 'i-lucide-shield', defaultRoute: '/dashboard' }
]

export function getRoleConfig(role: UserRole): RoleConfig {
  return ROLES.find(r => r.code === role) ?? ROLES[0]!
}

export function getRoleLabel(role: UserRole): string {
  return getRoleConfig(role).label
}

export function getDefaultRouteForRole(role: UserRole): string {
  return getRoleConfig(role).defaultRoute
}

/** Routes accessibles par rôle (labels sidebar) */
export const ROUTE_ROLES: Record<string, UserRole[]> = {
  '/inventaire': ['operateur', 'logistique', 'admin'],
  '/inventaire/spare': ['operateur', 'logistique', 'admin'],
  '/inventaire/products': ['operateur', 'logistique', 'admin'],
  '/inventaire/returned': ['operateur', 'logistique', 'admin'],
  '/bom': ['operateur', 'logistique', 'admin'],
  '/batch': ['operateur', 'admin'],
  '/commands': ['commercial', 'admin'],
  '/delivery': ['commercial', 'logistique', 'admin'],
  '/activity': ['operateur', 'logistique', 'commercial', 'direction', 'admin'],
  '/dashboard': ['direction', 'admin'],
  '/notifications': ['logistique', 'direction', 'admin']
}

function normalizePath(path: string): string {
  const base = path.split('?')[0]?.split('#')[0] ?? path
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1)
  return base
}

export function canAccessRoute(role: UserRole, path: string): boolean {
  if (role === 'admin') return true
  const normalized = normalizePath(path)

  for (const [route, roles] of Object.entries(ROUTE_ROLES)) {
    if (normalized === route || normalized.startsWith(`${route}/`)) {
      return roles.includes(role)
    }
  }

  return true
}

export function canSeeNavItem(role: UserRole | null, allowedRoles: UserRole[]): boolean {
  if (!role) return false
  if (role === 'admin') return true
  return allowedRoles.includes(role)
}

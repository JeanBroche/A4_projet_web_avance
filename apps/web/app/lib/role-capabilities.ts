import type { UserRole } from '~/types'

/** Droits métier par rôle (matrice fonctionnelle AERONEXIS). */
export function canManageBatches(role: UserRole | null): boolean {
  return role === 'operateur' || role === 'admin'
}

export function canManageBomOrders(role: UserRole | null): boolean {
  return role === 'logistique' || role === 'admin'
}

export function canReserveMaterials(role: UserRole | null): boolean {
  return role === 'logistique' || role === 'admin'
}

export function canViewBomAndStock(role: UserRole | null): boolean {
  return role === 'operateur' || role === 'logistique' || role === 'admin'
}

export function canManageStock(role: UserRole | null): boolean {
  return role === 'logistique' || role === 'admin'
}

export function canPlanShipments(role: UserRole | null): boolean {
  return role === 'logistique' || role === 'commercial' || role === 'admin'
}

export function canManageOrders(role: UserRole | null): boolean {
  return role === 'commercial' || role === 'admin'
}

export function canViewDashboard(role: UserRole | null): boolean {
  return role === 'direction' || role === 'admin'
}

export function canViewNotifications(role: UserRole | null): boolean {
  return role === 'logistique' || role === 'direction' || role === 'admin'
}

export function rolePageSubtitle(role: UserRole | null): string {
  switch (role) {
    case 'operateur':
      return 'Consultation des OF, suivi des lots et signalement d\'anomalies'
    case 'logistique':
      return 'Stocks, réservations matières et planification des expéditions'
    case 'commercial':
      return 'Suivi des commandes clients, validations et statistiques'
    case 'direction':
      return 'KPI consolidés, marges et incidents critiques'
    case 'admin':
      return 'Accès complet à tous les modules'
    default:
      return ''
  }
}

/** Sites AERONEXIS pour filtres KPI et affichage. */
export const DASHBOARD_SITE_OPTIONS = [
  { label: 'Ensemble (tous les sites)', value: 'ALL' },
  { label: 'Lyon', value: 'SITE-LYO' },
  { label: 'Paris', value: 'SITE-PAR' }
] as const

export type DashboardSiteScope = (typeof DASHBOARD_SITE_OPTIONS)[number]['value']

const SITE_LABELS: Record<string, string> = {
  ALL: 'Ensemble — Lyon + Paris',
  'SITE-LYO': 'Site Lyon',
  'SITE-PAR': 'Site Paris',
  'SITE-HQ': 'Siège — Lyon'
}

export function dashboardSiteLabel(scope: string): string {
  return SITE_LABELS[scope] ?? scope
}

/** Résout le code site passé à l'adapter reporting (hors mode consolidé). */
export function reportingSiteCode(scope: string): string {
  if (scope === 'ALL') return 'SITE-LYO'
  if (scope === 'SITE-HQ') return 'SITE-LYO'
  return scope
}

export function defaultDashboardSiteScope(role: string | null, userSiteCode?: string): DashboardSiteScope {
  if (role === 'direction' || role === 'admin') return 'ALL'
  if (userSiteCode === 'SITE-PAR') return 'SITE-PAR'
  return 'SITE-LYO'
}

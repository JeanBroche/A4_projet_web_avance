export type UserRole = 'operateur' | 'logistique' | 'commercial' | 'direction' | 'admin'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  siteCode?: string
  avatar?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResult {
  user: User
  /** Présents uniquement en mode mock */
  accessToken?: string
  refreshToken?: string
}

export interface SessionState {
  user: User | null
  /** Présents uniquement en mode mock */
  accessToken?: string | null
  refreshToken?: string | null
}

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
  accessToken: string
  refreshToken: string
  user: User
}

export interface SessionState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
}

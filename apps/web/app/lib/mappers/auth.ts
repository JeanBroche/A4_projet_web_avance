import type { LoginResult, User, UserRole } from '~/types'

type BackendRole = { code: string, label?: string }

type BackendUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  siteCode?: string | null
  roles?: BackendRole[]
}

const ROLE_PRIORITY: UserRole[] = ['admin', 'direction', 'commercial', 'logistique', 'operateur']

function pickPrimaryRole(roles: BackendRole[]): UserRole {
  const codes = new Set(roles.map(r => r.code))
  for (const role of ROLE_PRIORITY) {
    if (codes.has(role)) return role
  }
  return 'operateur'
}

export function mapAuthUser(user: BackendUser, roles?: BackendRole[]): User {
  const roleList = roles ?? user.roles ?? []
  return {
    id: user.id,
    email: user.email,
    name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    role: pickPrimaryRole(roleList),
    siteCode: user.siteCode ?? undefined
  }
}

export function mapLoginResult(data: {
  accessToken?: string
  refreshToken?: string
  user: BackendUser
  roles?: BackendRole[]
}): LoginResult {
  return {
    user: mapAuthUser(data.user, data.roles ?? data.user.roles),
    ...(data.accessToken ? { accessToken: data.accessToken } : {}),
    ...(data.refreshToken ? { refreshToken: data.refreshToken } : {})
  }
}

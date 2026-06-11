import type { User, UserRole } from '~/types'

export interface MockAccount {
  email: string
  password: string
  user: User
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: 'admin@aeronexis.local',
    password: 'admin123',
    user: {
      id: '1',
      email: 'admin@aeronexis.local',
      name: 'Admin AERONEXIS',
      role: 'admin',
      siteCode: 'SITE-01',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Admin'
    }
  },
  {
    email: 'operateur@aeronexis.local',
    password: 'operateur123',
    user: {
      id: '2',
      email: 'operateur@aeronexis.local',
      name: 'Jean Martin',
      role: 'operateur',
      siteCode: 'SITE-01',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Jean'
    }
  },
  {
    email: 'logistique@aeronexis.local',
    password: 'logistique123',
    user: {
      id: '3',
      email: 'logistique@aeronexis.local',
      name: 'Lucie Bernard',
      role: 'logistique',
      siteCode: 'SITE-01',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Lucie'
    }
  },
  {
    email: 'commercial@aeronexis.local',
    password: 'commercial123',
    user: {
      id: '4',
      email: 'commercial@aeronexis.local',
      name: 'Marie Dupont',
      role: 'commercial',
      siteCode: 'SITE-01',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Marie'
    }
  },
  {
    email: 'direction@aeronexis.local',
    password: 'direction123',
    user: {
      id: '5',
      email: 'direction@aeronexis.local',
      name: 'Paul Renaud',
      role: 'direction',
      siteCode: 'SITE-01',
      avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Paul'
    }
  }
]

export function findMockAccount(email: string, password: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find(a => a.email === email && a.password === password)
}

export function findMockUserByToken(token: string): User | undefined {
  const account = MOCK_ACCOUNTS.find(a => `mock-token-${a.user.id}` === token)
  return account?.user
}

export function createMockTokens(userId: string) {
  return {
    accessToken: `mock-token-${userId}`,
    refreshToken: `mock-refresh-${userId}`
  }
}

export function switchMockRole(userId: string, role: UserRole): User | undefined {
  const account = MOCK_ACCOUNTS.find(a => a.user.id === userId)
  if (!account) return undefined
  return { ...account.user, role }
}

import type { Adapters } from '~/lib/adapters/types'
import { createMockAdapters } from '~/lib/adapters/mock'
import { createMoleculerAdapters } from '~/lib/adapters/moleculer'

let mockAdapters: Adapters | null = null

export function useAdapters(): Adapters {
  const config = useRuntimeConfig()
  const { session } = useSessionState()

  if (config.public.apiAdapter === 'moleculer') {
    const siteCode = () => session.value.user?.siteCode ?? 'SITE-LYO'
    return createMoleculerAdapters(() => session.value.accessToken, siteCode)
  }

  if (!mockAdapters) {
    mockAdapters = createMockAdapters()
  }
  return mockAdapters
}

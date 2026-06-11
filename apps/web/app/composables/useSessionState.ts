import type { SessionState } from '~/types'

const SESSION_COOKIE = 'aeronexis-session'

function emptySession(): SessionState {
  return { user: null }
}

export function useSessionState() {
  const cookie = useCookie<string | null>(SESSION_COOKIE, {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax'
  })

  const session = useState<SessionState>('session', () => {
    if (cookie.value) {
      try {
        const parsed = JSON.parse(cookie.value) as SessionState
        return { user: parsed.user ?? null }
      } catch {
        return emptySession()
      }
    }
    return emptySession()
  })

  function persist(next: SessionState) {
    session.value = next
    cookie.value = JSON.stringify({ user: next.user })
  }

  function clear() {
    persist(emptySession())
  }

  return { session, persist, clear }
}

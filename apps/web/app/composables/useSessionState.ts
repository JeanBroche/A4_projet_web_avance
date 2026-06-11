import type { SessionState } from '~/types'

const SESSION_COOKIE = 'aeronexis-session'

function emptySession(): SessionState {
  return { accessToken: null, refreshToken: null, user: null }
}

export function useSessionState() {
  const cookie = useCookie<string | null>(SESSION_COOKIE, {
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax'
  })

  const session = useState<SessionState>('session', () => {
    if (cookie.value) {
      try {
        return JSON.parse(cookie.value) as SessionState
      } catch {
        return emptySession()
      }
    }
    return emptySession()
  })

  function persist(next: SessionState) {
    session.value = next
    cookie.value = JSON.stringify(next)
  }

  function clear() {
    persist(emptySession())
  }

  return { session, persist, clear }
}

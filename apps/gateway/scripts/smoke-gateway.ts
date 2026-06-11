import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(import.meta.dirname, '../../../.env') })

const baseUrl = process.env.GATEWAY_URL ?? `http://localhost:${process.env.GATEWAY_PORT ?? 4000}`

type RequestResult = {
  response: Response
  body: unknown
  cookies: Map<string, string>
}

function collectSetCookies(response: Response): Map<string, string> {
  const cookies = new Map<string, string>()
  const headers = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : []
  for (const header of headers) {
    const [pair] = header.split(';')
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1))
  }
  return cookies
}

function cookieHeader(cookies: Map<string, string>): string | undefined {
  if (cookies.size === 0) return undefined
  return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

async function request(
  path: string,
  options: RequestInit & { cookies?: Map<string, string> } = {}
): Promise<RequestResult> {
  const cookieValue = options.cookies ? cookieHeader(options.cookies) : undefined
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(cookieValue ? { Cookie: cookieValue } : {}),
      ...(options.headers ?? {})
    },
    ...options
  })
  const body = await response.json().catch(() => null)
  const cookies = collectSetCookies(response)
  for (const [name, value] of options.cookies ?? []) {
    if (!cookies.has(name)) cookies.set(name, value)
  }
  return { response, body, cookies }
}

type SmokeCase = {
  name: string
  path: string
  method?: string
  body?: unknown
  optional?: boolean
}

const restSmokeCases: SmokeCase[] = [
  { name: 'stock levels', path: '/api/stock/levels' },
  { name: 'stock reservations', path: '/api/stock/reservations' },
  { name: 'order history', path: '/api/commercial/orders/history' },
  { name: 'production BOM', path: '/api/production/bom' },
  { name: 'production batches', path: '/api/production/batches' },
  { name: 'shipments history', path: '/api/logistics/shipments' },
  { name: 'notifications', path: '/api/notifications' },
  { name: 'reporting rupture (direction)', path: '/api/reporting/kpis/logistique/rupture', optional: true }
]

async function main() {
  console.log(`Smoke gateway @ ${baseUrl}`)

  const health = await request('/health')
  if (!health.response.ok) {
    throw new Error(`GET /health failed: ${health.response.status}`)
  }
  const healthBody = health.body as { status?: string; services?: unknown[] }
  console.log(`✓ GET /health (${healthBody.status ?? 'unknown'}, ${healthBody.services?.length ?? 0} services)`)

  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!'
  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'direction@aeronexis.local',
      password
    })
  })

  if (!login.response.ok) {
    throw new Error(`POST /api/auth/login failed: ${login.response.status} ${JSON.stringify(login.body)}`)
  }

  const accessFromCookie = login.cookies.get('aeronexis_access_token')
  if (!accessFromCookie) {
    throw new Error('Login response missing aeronexis_access_token cookie')
  }
  console.log('✓ POST /api/auth/login (HttpOnly cookies)')

  const meWithCookie = await request('/api/auth/me', { cookies: login.cookies })
  if (!meWithCookie.response.ok) {
    throw new Error(`GET /api/auth/me with cookie failed: ${meWithCookie.response.status}`)
  }
  console.log('✓ GET /api/auth/me (cookie)')

  const meWithBearer = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessFromCookie}` }
  })
  if (!meWithBearer.response.ok) {
    throw new Error(`GET /api/auth/me with Bearer failed: ${meWithBearer.response.status}`)
  }
  console.log('✓ GET /api/auth/me (Bearer fallback)')

  const refresh = await request('/api/auth/refresh', {
    method: 'POST',
    cookies: login.cookies
  })
  if (!refresh.response.ok) {
    throw new Error(`POST /api/auth/refresh failed: ${refresh.response.status}`)
  }
  console.log('✓ POST /api/auth/refresh (cookie)')

  const sessionCookies = refresh.cookies.size > 0 ? refresh.cookies : login.cookies

  const kpiSite = await request('/api/reporting/kpis/logistique/rupture?siteCode=SITE-LYO', {
    cookies: sessionCookies
  })
  if (!kpiSite.response.ok) {
    console.warn(`⚠ KPI rupture with siteCode — ${kpiSite.response.status} (optionnel)`)
  } else {
    console.log('✓ GET /api/reporting/kpis/logistique/rupture?siteCode=SITE-LYO')
  }

  for (const testCase of restSmokeCases) {
    const result = await request(testCase.path, {
      method: testCase.method ?? 'GET',
      cookies: sessionCookies,
      body: testCase.body ? JSON.stringify(testCase.body) : undefined
    })
    if (!result.response.ok) {
      if (testCase.optional) {
        console.warn(`⚠ GET ${testCase.path} (${testCase.name}) — ${result.response.status} (optionnel)`)
        continue
      }
      throw new Error(`${testCase.name}: ${testCase.path} -> ${result.response.status} ${JSON.stringify(result.body)}`)
    }
    console.log(`✓ ${testCase.method ?? 'GET'} ${testCase.path} (${testCase.name})`)
  }

  const reservations = await request('/api/stock/reservations', { cookies: sessionCookies })
  const reservationItems =
    (reservations.body as { data?: { items?: unknown[] }; items?: unknown[] })?.data?.items ??
    (reservations.body as { items?: unknown[] })?.items ??
    []
  if (!Array.isArray(reservationItems) || reservationItems.length < 1) {
    throw new Error(`stock reservations: expected >= 1 item after seed, got ${reservationItems.length}`)
  }
  console.log(`✓ seed check: stock reservations (${reservationItems.length})`)

  const unread = await request('/api/notifications/unread-count', { cookies: sessionCookies })
  const unreadCount =
    (unread.body as { data?: { count?: number }; count?: number })?.data?.count ??
    (unread.body as { count?: number })?.count ??
    0
  if (unreadCount < 1) {
    throw new Error(`notifications unread-count: expected >= 1 after seed, got ${unreadCount}`)
  }
  console.log(`✓ seed check: notifications unread-count (${unreadCount})`)

  const history = await request('/api/commercial/orders/history', { cookies: sessionCookies })
  const orders =
    (history.body as { data?: { items?: Array<{ status?: string }> }; items?: Array<{ status?: string }> })
      ?.data?.items ??
    (history.body as { items?: Array<{ status?: string }> })?.items ??
    []
  const statuses = new Set(orders.map((o) => o.status).filter(Boolean))
  if (statuses.size < 3) {
    throw new Error(
      `order history: expected >= 3 distinct statuses after seed, got ${statuses.size} (${[...statuses].join(', ')})`
    )
  }
  console.log(`✓ seed check: order statuses (${statuses.size}: ${[...statuses].join(', ')})`)

  console.log('Gateway smoke test passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

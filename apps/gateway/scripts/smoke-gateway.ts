import { config } from 'dotenv'
import { resolve } from 'node:path'

config({ path: resolve(import.meta.dirname, '../../../.env') })

const baseUrl = process.env.GATEWAY_URL ?? `http://localhost:${process.env.GATEWAY_PORT ?? 4000}`

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  })
  const body = await response.json().catch(() => null)
  return { response, body }
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
  console.log('✓ GET /health')

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

  const loginPayload = login.body as {
    data?: { accessToken?: string, refreshToken?: string }
    accessToken?: string
    refreshToken?: string
  }
  const token = loginPayload.data?.accessToken ?? loginPayload.accessToken
  const refreshToken = loginPayload.data?.refreshToken ?? loginPayload.refreshToken
  if (!token) {
    throw new Error('Login response missing accessToken')
  }
  console.log('✓ POST /api/auth/login')

  const me = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!me.response.ok) {
    throw new Error(`GET /api/auth/me failed: ${me.response.status}`)
  }
  console.log('✓ GET /api/auth/me')

  const refresh = await request('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  })
  if (!refresh.response.ok) {
    throw new Error(`POST /api/auth/refresh failed: ${refresh.response.status}`)
  }
  console.log('✓ POST /api/auth/refresh (public)')

  const kpiSite = await request('/api/reporting/kpis/logistique/rupture?siteCode=SITE-LYO', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!kpiSite.response.ok) {
    console.warn(`⚠ KPI rupture with siteCode — ${kpiSite.response.status} (optionnel)`)
  } else {
    console.log('✓ GET /api/reporting/kpis/logistique/rupture?siteCode=SITE-LYO')
  }

  for (const testCase of restSmokeCases) {
    const result = await request(testCase.path, {
      method: testCase.method ?? 'GET',
      headers: { Authorization: `Bearer ${token}` },
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

  const reservations = await request('/api/stock/reservations', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const reservationItems =
    (reservations.body as { data?: { items?: unknown[] }; items?: unknown[] })?.data?.items ??
    (reservations.body as { items?: unknown[] })?.items ??
    []
  if (!Array.isArray(reservationItems) || reservationItems.length < 1) {
    throw new Error(`stock reservations: expected >= 1 item after seed, got ${reservationItems.length}`)
  }
  console.log(`✓ seed check: stock reservations (${reservationItems.length})`)

  const unread = await request('/api/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const unreadCount =
    (unread.body as { data?: { count?: number }; count?: number })?.data?.count ??
    (unread.body as { count?: number })?.count ??
    0
  if (unreadCount < 1) {
    throw new Error(`notifications unread-count: expected >= 1 after seed, got ${unreadCount}`)
  }
  console.log(`✓ seed check: notifications unread-count (${unreadCount})`)

  const history = await request('/api/commercial/orders/history', {
    headers: { Authorization: `Bearer ${token}` }
  })
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

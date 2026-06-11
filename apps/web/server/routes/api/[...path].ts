import { proxyRequest } from 'h3'

/**
 * Proxy REST gateway (/api/*) — les routes Nitro plus spécifiques (ex. server/api/ai/of) restent prioritaires.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const target = `${config.gatewayUrl}${event.path}`
  return proxyRequest(event, target)
})

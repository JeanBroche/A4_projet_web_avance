/**
 * Adapter Moleculer — Stock
 * Routes gateway prévues :
 *   GET  /api/v1/stock/levels           → stock.level.list
 *   POST /api/v1/stock/movements        → stock.movement.create
 *   GET  /api/v1/stock/alerts           → stock.alert.list
 *   PUT  /api/v1/stock/thresholds       → stock.threshold.upsert
 *   GET  /api/v1/stock/reservations    → stock.reservation.list
 *   POST /api/v1/stock/reservations    → stock.reservation.create
 *   POST /api/v1/stock/reservations/:id/release → stock.reservation.release
 *   POST /api/v1/stock/reservations/:id/cancel  → stock.reservation.cancel
 */
import { useApiClient } from '~/lib/api/client'
import type { StockAdapter } from '~/lib/adapters/types'

export function createMoleculerStockAdapter(getToken: () => string | null): StockAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    listLevels() {
      return request('/v1/stock/levels', { accessToken: token() })
    },
    createLevel(input) {
      return request('/v1/stock/levels', { method: 'POST', body: input, accessToken: token() })
    },
    updateLevel(id, qty) {
      return request(`/v1/stock/levels/${id}`, { method: 'PATCH', body: { qty }, accessToken: token() })
    },
    deleteLevel(id) {
      return request(`/v1/stock/levels/${id}`, { method: 'DELETE', accessToken: token() })
    },
    listReturned() {
      return request('/v1/stock/returns', { accessToken: token() })
    },
    createReturned(input) {
      return request('/v1/stock/returns', { method: 'POST', body: input, accessToken: token() })
    },
    updateReturned(id, qty, state) {
      return request(`/v1/stock/returns/${id}`, { method: 'PATCH', body: { qty, state }, accessToken: token() })
    },
    deleteReturned(id) {
      return request(`/v1/stock/returns/${id}`, { method: 'DELETE', accessToken: token() })
    },
    listReservations(ofId) {
      const query = ofId ? `?ofId=${encodeURIComponent(ofId)}` : ''
      return request(`/v1/stock/reservations${query}`, { accessToken: token() })
    },
    createReservation(input) {
      return request('/v1/stock/reservations', { method: 'POST', body: input, accessToken: token() })
    },
    releaseReservation(id) {
      return request(`/v1/stock/reservations/${id}/release`, { method: 'POST', accessToken: token() })
    },
    cancelReservation(id) {
      return request(`/v1/stock/reservations/${id}/cancel`, { method: 'POST', accessToken: token() })
    }
  }
}

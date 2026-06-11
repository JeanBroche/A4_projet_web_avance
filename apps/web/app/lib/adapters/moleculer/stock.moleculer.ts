/**
 * Adapter Moleculer — Stock
 * Routes gateway prévues :
 *   GET  /api/stock/levels           → stock.level.list
 *   POST /api/stock/movements        → stock.movement.create
 *   GET  /api/stock/alerts           → stock.alert.list
 *   PUT  /api/stock/thresholds       → stock.threshold.upsert
 *   GET  /api/stock/reservations    → stock.reservation.list
 *   POST /api/stock/reservations    → stock.reservation.create
 *   POST /api/stock/reservations/:id/release → stock.reservation.release
 *   POST /api/stock/reservations/:id/cancel  → stock.reservation.cancel
 */
import { useApiClient } from '~/lib/api/client'
import type { StockAdapter } from '~/lib/adapters/types'

export function createMoleculerStockAdapter(getToken: () => string | null): StockAdapter {
  const { request } = useApiClient()
  const token = () => getToken()

  return {
    listLevels() {
      return request('/stock/levels', { accessToken: token() })
    },
    createLevel(input) {
      return request('/stock/levels', { method: 'POST', body: input, accessToken: token() })
    },
    updateLevel(id, qty) {
      return request(`/stock/levels/${id}`, { method: 'PATCH', body: { qty }, accessToken: token() })
    },
    deleteLevel(id) {
      return request(`/stock/levels/${id}`, { method: 'DELETE', accessToken: token() })
    },
    listReturned() {
      return request('/stock/returns', { accessToken: token() })
    },
    createReturned(input) {
      return request('/stock/returns', { method: 'POST', body: input, accessToken: token() })
    },
    updateReturned(id, qty, state) {
      return request(`/stock/returns/${id}`, { method: 'PATCH', body: { qty, state }, accessToken: token() })
    },
    deleteReturned(id) {
      return request(`/stock/returns/${id}`, { method: 'DELETE', accessToken: token() })
    },
    listReservations(ofId) {
      const query = ofId ? `?ofId=${encodeURIComponent(ofId)}` : ''
      return request(`/stock/reservations${query}`, { accessToken: token() })
    },
    createReservation(input) {
      return request('/stock/reservations', { method: 'POST', body: input, accessToken: token() })
    },
    releaseReservation(id) {
      return request(`/stock/reservations/${id}/release`, { method: 'POST', accessToken: token() })
    },
    cancelReservation(id) {
      return request(`/stock/reservations/${id}/cancel`, { method: 'POST', accessToken: token() })
    },
    getRuptureForecast() {
      return request('/stock/forecast/rupture', { accessToken: token() })
    },
    reportSupplierDelay(input) {
      return request('/stock/supplier-delays', { method: 'POST', body: input, accessToken: token() })
    },
    listSupplierDelays() {
      return request('/stock/supplier-delays', { accessToken: token() })
    }
  }
}

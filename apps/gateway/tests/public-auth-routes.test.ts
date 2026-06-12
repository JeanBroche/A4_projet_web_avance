import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isPublicAuthRoute, requestPath } from '../src/public-auth-routes.js'

describe('public-auth-routes', () => {
  it('recognizes login and refresh paths', () => {
    assert.equal(requestPath({ url: '/api/auth/login' }), '/api/auth/login')
    assert.equal(requestPath({ url: '/api/auth/refresh?x=1' }), '/api/auth/refresh')
    assert.ok(isPublicAuthRoute({ url: '/api/auth/login' }))
    assert.ok(isPublicAuthRoute({ url: '/api/auth/refresh' }))
  })

  it('does not treat protected routes as public', () => {
    assert.equal(isPublicAuthRoute({ url: '/api/auth/me' }), false)
    assert.equal(isPublicAuthRoute({ url: '/api/stock/reservations' }), false)
  })
})

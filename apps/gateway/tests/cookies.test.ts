import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildAuthCookieHeaders,
  buildClearAuthCookieHeaders,
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  parseCookies,
  serializeCookie
} from '../src/cookies.js'

describe('cookies', () => {
  it('parses cookie header', () => {
    const cookies = parseCookies({
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE}=abc123; ${REFRESH_TOKEN_COOKIE}=def456`
      }
    })
    assert.equal(cookies[ACCESS_TOKEN_COOKIE], 'abc123')
    assert.equal(cookies[REFRESH_TOKEN_COOKIE], 'def456')
  })

  it('extracts tokens from request', () => {
    const req = {
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE}=access; ${REFRESH_TOKEN_COOKIE}=refresh`
      }
    }
    assert.equal(getAccessTokenFromRequest(req), 'access')
    assert.equal(getRefreshTokenFromRequest(req), 'refresh')
  })

  it('serializes HttpOnly cookies with configurable secure flag', () => {
    const previous = process.env.COOKIE_SECURE
    process.env.COOKIE_SECURE = 'false'
    const serialized = serializeCookie('test', 'value', { maxAge: 60, path: '/' })
    assert.match(serialized, /HttpOnly/)
    assert.match(serialized, /SameSite=Lax/)
    assert.doesNotMatch(serialized, /Secure/)
    process.env.COOKIE_SECURE = previous
  })

  it('builds auth and clear cookie header sets', () => {
    const authHeaders = buildAuthCookieHeaders('access-token', 'refresh-token')
    assert.equal(authHeaders.length, 2)
    assert.match(authHeaders[0]!, new RegExp(`${ACCESS_TOKEN_COOKIE}=access-token`))
    assert.match(authHeaders[1]!, new RegExp(`${REFRESH_TOKEN_COOKIE}=refresh-token`))

    const clearHeaders = buildClearAuthCookieHeaders()
    assert.equal(clearHeaders.length, 2)
    assert.match(clearHeaders[0]!, /Max-Age=0/)
    assert.match(clearHeaders[1]!, /Max-Age=0/)
  })
})

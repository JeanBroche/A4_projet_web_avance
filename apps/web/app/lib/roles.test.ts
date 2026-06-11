import { describe, expect, it } from 'vitest'
import { canAccessRoute, getDefaultRouteForRole } from './roles'

describe('canAccessRoute', () => {
  it('allows operateur on batch', () => {
    expect(canAccessRoute('operateur', '/batch')).toBe(true)
  })

  it('denies operateur on dashboard', () => {
    expect(canAccessRoute('operateur', '/dashboard')).toBe(false)
  })

  it('allows admin everywhere', () => {
    expect(canAccessRoute('admin', '/dashboard')).toBe(true)
    expect(canAccessRoute('admin', '/commands')).toBe(true)
  })
})

describe('getDefaultRouteForRole', () => {
  it('returns role home', () => {
    expect(getDefaultRouteForRole('direction')).toBe('/dashboard')
    expect(getDefaultRouteForRole('commercial')).toBe('/commands')
  })
})

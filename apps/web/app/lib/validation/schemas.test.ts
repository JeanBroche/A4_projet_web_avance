import { describe, expect, it } from 'vitest'
import { createBatchSchema, createShipmentSchema, loginSchema } from './schemas'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'bad', password: 'x' })
    expect(result.success).toBe(false)
  })
})

describe('createBatchSchema', () => {
  it('requires ofNumber', () => {
    const result = createBatchSchema.safeParse({
      productName: 'Pièce',
      qty: 1,
      priority: 'normal',
      emoji: '📦'
    })
    expect(result.success).toBe(false)
  })
})

describe('createShipmentSchema', () => {
  it('accepts orderNumber optional', () => {
    const result = createShipmentSchema.safeParse({
      client: 'Airbus',
      address: 'Hamburg',
      carrier: 'DHL',
      estimatedDelivery: '2026-06-12',
      emoji: '🚚',
      orderNumber: 'CMD-2026-101'
    })
    expect(result.success).toBe(true)
  })
})

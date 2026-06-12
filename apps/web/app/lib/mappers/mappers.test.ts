import { describe, expect, it } from 'vitest'
import { mapOrderToUi } from '~/lib/mappers/order'
import { mapBomToUi } from '~/lib/mappers/production'
import { mapMaterialToStockLevel, mapReservationToUi } from '~/lib/mappers/stock'
import {
  mapAuditChangeToActivity,
  mapBatchHistoryToTraceEvents,
  mapLotTraceToUi
} from '~/lib/mappers/audit'
import { toNumericId } from '~/lib/mappers/id'

describe('front mappers', () => {
  it('maps order summary to UI shape', () => {
    const ui = mapOrderToUi({
      id: 'order-1',
      orderNumber: 'CMD-2026-00001',
      status: 'VALIDATED',
      isUrgent: true,
      createdAt: '2026-01-01',
      client: { name: 'Airbus', code: 'AIRBUS' },
      lines: [{ quantity: 3 }]
    })
    expect(ui.orderNumber).toBe('CMD-2026-00001')
    expect(ui.validationStatus).toBe('validated')
    expect(ui.priority).toBe('urgent')
    expect(ui.id).toBe(toNumericId('order-1'))
    expect(ui.hasAnomaly).toBe(false)
  })

  it('maps material level to UI shape', () => {
    const ui = mapMaterialToStockLevel({
      materialId: 'mat-1',
      code: 'MAT-001',
      description: 'Acier',
      unit: 'pcs',
      current: 10,
      reserved: 2,
      available: 8,
      minimum: 5
    })
    expect(ui.reference).toBe('MAT-001')
    expect(ui.available).toBe(8)
    expect(ui.id).toBe(toNumericId('mat-1'))
  })

  it('maps reservation materialId to stock code', () => {
    const ui = mapReservationToUi({
      id: 'res-1',
      ofId: 'BOM-SEED-001',
      materialId: 'clmatinternal0001',
      quantity: 4,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      material: { code: 'MAT-001', description: 'Acier', unit: 'kg' }
    })
    expect(ui.materialId).toBe('MAT-001')
    expect(ui.ofId).toBe('BOM-SEED-001')
  })

  it('maps audit change API payload to activity', () => {
    const activity = mapAuditChangeToActivity({
      id: 'abc123',
      who: {
        userId: 'clh7seedauthoper000000001',
        email: 'operateur@aeronexis.local',
        roles: ['operateur']
      },
      when: '2026-06-12T04:44:45.825Z',
      what: {
        action: 'production.batch.update',
        entity: 'BatchProduct',
        entityId: 'cmqa7i0g5000kus6mgdmi4y7u',
        metadata: { batch_code: 'BATCH-SEED-005' }
      }
    }, 0)

    expect(activity.title).toBe('Lot modifié')
    expect(activity.userId).toBe('clh7seedauthoper000000001')
    expect(activity.user).toBe('operateur@aeronexis.local')
    expect(activity.description).toBe('Lot BATCH-SEED-005')
    expect(activity.meta).toBe('BATCH-SEED-005')
    expect(activity.type).toBe('of_started')
  })

  it('maps lot trace timeline payload to UI events', () => {
    const ui = mapLotTraceToUi({
      lot: {
        lotId: 'BATCH-SEED-005',
        ofId: 'BATCH-SEED-005',
        productCode: 'PROD-005',
        siteCode: 'SITE-LYO',
        status: 'IN_PROGRESS'
      },
      timeline: [
        {
          timestamp: '2026-02-01T10:00:00.000Z',
          source: 'production',
          type: 'production.batch.created',
          label: 'BATCH-SEED-005 created',
          status: 'ok',
          payload: { batchCode: 'BATCH-SEED-005', actor: 'ops@aeronexis.test' }
        },
        {
          timestamp: '2026-02-01T11:00:00.000Z',
          source: 'stock',
          type: 'stock.movement',
          label: 'Stock OUT (5)',
          status: 'ok',
          payload: { quantity: 5 }
        }
      ],
      summary: { eventCount: 2, sources: ['production', 'stock'] }
    } as Parameters<typeof mapLotTraceToUi>[0])

    expect(ui.lotId).toBe('BATCH-SEED-005')
    expect(ui.ofNumber).toBe('BATCH-SEED-005')
    expect(ui.events).toHaveLength(2)
    expect(ui.events[0]?.source).toBe('production')
    expect(ui.events[0]?.title).toBe('BATCH-SEED-005 created')
    expect(ui.events[0]?.actor).toBe('ops@aeronexis.test')
    expect(ui.events[1]?.source).toBe('stock')
    expect(ui.events[1]?.description).toContain('quantity: 5')
  })

  it('maps batch history entries to French-labelled trace events', () => {
    const events = mapBatchHistoryToTraceEvents([
      {
        id: 'h1',
        action: 'batch.created',
        details: 'Lot initial',
        performedBy: 'ops@aeronexis.test',
        createdAt: '2026-02-01T08:00:00.000Z'
      },
      {
        id: 'h2',
        action: 'batch.status_changed',
        details: 'PENDING -> IN_PROGRESS',
        performedBy: 'ops@aeronexis.test',
        createdAt: '2026-02-01T09:00:00.000Z'
      }
    ])

    expect(events).toHaveLength(2)
    expect(events[0]?.title).toBe('Lot créé')
    expect(events[0]?.source).toBe('production')
    expect(events[1]?.title).toBe('Changement de statut')
    expect(events[1]?.description).toBe('PENDING -> IN_PROGRESS')
  })

  it('computes BOM need from per-unit coefficient × order qty', () => {
    const ui = mapBomToUi({
      id: 'bom-1',
      bom_code: 'BOM-SEED-004',
      description: 'Bras',
      quantity: 10,
      status: 'PENDING',
      lines: [
        { material_id: 'MAT-001', quantity: 1 },
        { material_id: 'MAT-004', quantity: 2 }
      ]
    })
    expect(ui.bom[0]?.qtyPerUnit).toBe(1)
    expect(ui.bom[0]?.qtyNeeded).toBe(10)
    expect(ui.bom[1]?.qtyNeeded).toBe(20)
    expect(ui.bom[0]?.qtyStock).toBe(0)
  })
})

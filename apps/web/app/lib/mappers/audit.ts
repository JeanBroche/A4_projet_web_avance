import { toNumericId } from '~/lib/mappers/id'
import type { Activity } from '~/types'

type BackendChange = {
  id?: string
  _id?: string
  action?: string
  entity?: string
  actorEmail?: string
  actorId?: string
  createdAt?: string | Date
  metadata?: Record<string, unknown>
}

function resolveActivityType(action?: string): Activity['type'] {
  if (!action) return 'stock_updated'
  if (action.includes('login')) return 'login'
  if (action.includes('anomaly')) return 'anomaly'
  if (action.includes('stock')) return 'stock_updated'
  if (action.includes('production') || action.includes('batch')) return 'of_started'
  if (action.includes('order') || action.includes('bom')) return 'bom_validated'
  return 'stock_updated'
}

export function mapAuditChangeToActivity(change: BackendChange, index: number): Activity {
  const id = change.id ?? change._id ?? String(index)
  const action = change.action ?? change.entity ?? 'event'
  return {
    id: toNumericId(id),
    type: resolveActivityType(action),
    title: action,
    description: JSON.stringify(change.metadata ?? {}),
    userId: change.actorId,
    user: change.actorEmail ?? 'système',
    date: new Date(change.createdAt ?? Date.now()),
    meta: change.entity
  }
}

export function mapLotTraceToUi(trace: {
  lotNumber?: string
  lotId?: string
  ofNumber?: string
  productName?: string
  events?: Array<{
    id: string
    at: string | Date
    source?: string
    title?: string
    description?: string
    actor?: string
  }>
}) {
  return {
    lotId: trace.lotId ?? trace.lotNumber ?? '—',
    lotNumber: trace.lotNumber ?? '—',
    ofNumber: trace.ofNumber ?? '—',
    productName: trace.productName ?? '—',
    events: (trace.events ?? []).map(event => ({
      id: event.id,
      at: new Date(event.at),
      source: (event.source ?? 'audit') as 'production' | 'stock' | 'shipment' | 'audit',
      title: event.title ?? 'Événement',
      description: event.description ?? '',
      actor: event.actor
    }))
  }
}

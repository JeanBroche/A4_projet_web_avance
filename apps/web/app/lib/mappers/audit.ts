import { toNumericId } from '~/lib/mappers/id'
import type { Activity, BatchHistoryEntry, LotTraceEvent } from '~/types'

const BATCH_ACTION_LABELS: Record<string, string> = {
  'batch.created': 'Lot créé',
  'batch.status_changed': 'Changement de statut',
  'batch.progress': 'Avancement',
  'batch.of_assigned': 'OF rattaché',
  'batch.step_updated': 'Étape mise à jour',
  'batch.anomaly_reported': 'Anomalie signalée',
  'batch.anomaly_updated': 'Anomalie mise à jour',
  'batch.deleted': 'Lot supprimé'
}

export function mapBatchHistoryToTraceEvents(entries: BatchHistoryEntry[]): LotTraceEvent[] {
  return entries.map((entry) => ({
    id: `production-${entry.id}`,
    at: new Date(entry.createdAt),
    source: 'production',
    title: BATCH_ACTION_LABELS[entry.action] ?? entry.action,
    description: entry.details ?? '',
    actor: entry.performedBy ?? undefined
  }))
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Connexion',
  'auth.logout': 'Déconnexion',
  'production.bom.create': 'OF créé',
  'production.bom.update': 'OF modifié',
  'production.bom.delete': 'OF supprimé',
  'production.batch.create': 'Lot créé',
  'production.batch.update': 'Lot modifié',
  'production.batch.delete': 'Lot supprimé',
  'production.batch.addAnomalies': 'Anomalie signalée',
  'production.batch.updateAnomalies': 'Anomalie mise à jour',
  'production.anomaly.report': 'Anomalie signalée',
  'stock.reservation.create': 'Stock réservé',
  'stock.reservation.update': 'Réservation modifiée',
  'stock.reservation.cancel': 'Réservation annulée',
  'stock.reservation.release': 'Réservation libérée',
  'stock.reserve': 'Stock réservé',
  'order.validate': 'Commande validée',
  'shipment.plan': 'Expédition planifiée',
  'shipment.dispatch': 'Expédition expédiée'
}

type BackendChangeWhat = {
  action?: string
  entity?: string
  entityId?: string | null
  diff?: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null
  metadata?: Record<string, unknown> | null
}

type BackendChangeItem = {
  id?: string
  _id?: string
  who?: {
    userId?: string
    email?: string
    roles?: string[]
  }
  when?: string | Date
  what?: BackendChangeWhat
  action?: string
  entity?: string
  actorEmail?: string
  actorId?: string
  createdAt?: string | Date
  metadata?: Record<string, unknown>
}

function resolveActivityType(action?: string): Activity['type'] {
  if (!action) return 'stock_updated'
  if (action.includes('login') || action.includes('logout')) return 'login'
  if (action.includes('anomaly')) return 'anomaly'
  if (action.includes('reservation.create') || action.includes('reserve')) return 'stock_reserved'
  if (action.includes('reservation.release')) return 'stock_released'
  if (action.includes('reservation.cancel')) return 'stock_released'
  if (action.includes('stock')) return 'stock_updated'
  if (action.includes('batch.completed') || action.includes('.done')) return 'of_completed'
  if (action.includes('batch') && action.includes('pause')) return 'of_paused'
  if (action.includes('batch') || action.includes('production')) return 'of_started'
  if (action.includes('bom')) return 'bom_validated'
  if (action.includes('order')) return 'bom_validated'
  return 'stock_updated'
}

function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/\./g, ' · ')
}

function stringMeta(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function describeAuditChange(action: string, what: BackendChangeWhat): string {
  const meta = what.metadata ?? {}
  const message = stringMeta(meta.message)
  if (message) return message

  const batchCode = stringMeta(meta.batch_code)
  const bomCode = stringMeta(meta.bom_code) ?? stringMeta(meta.ofId)
  const anomalyCode = stringMeta(meta.anomaly_code)

  if (action.includes('anomaly') && anomalyCode) {
    return batchCode ? `Anomalie ${anomalyCode} sur le lot ${batchCode}` : `Anomalie ${anomalyCode}`
  }
  if (batchCode) return `Lot ${batchCode}`
  if (bomCode) return `OF ${bomCode}`

  if (what.diff?.before && what.diff.after) {
    const parts = Object.keys(what.diff.after).map((key) => {
      const before = what.diff?.before?.[key]
      const after = what.diff?.after?.[key]
      return `${key} : ${String(before)} → ${String(after)}`
    })
    if (parts.length) return parts.join(' · ')
  }

  if (what.entity && what.entityId) return `${what.entity}`
  return ''
}

function resolveAuditMeta(what: BackendChangeWhat): string | undefined {
  const meta = what.metadata ?? {}
  return stringMeta(meta.batch_code)
    ?? stringMeta(meta.bom_code)
    ?? stringMeta(meta.ofId)
    ?? stringMeta(meta.anomaly_code)
    ?? (what.entityId ? String(what.entityId) : undefined)
}

function normalizeBackendChange(change: BackendChangeItem) {
  if (change.what?.action || change.who) {
    const action = change.what?.action ?? 'event'
    return {
      id: change.id ?? change._id ?? '',
      action,
      entity: change.what?.entity,
      actorId: change.who?.userId,
      actorEmail: change.who?.email,
      createdAt: change.when,
      metadata: change.what?.metadata ?? undefined,
      what: change.what ?? { action }
    }
  }

  return {
    id: change.id ?? change._id ?? '',
    action: change.action ?? change.entity ?? 'event',
    entity: change.entity,
    actorId: change.actorId,
    actorEmail: change.actorEmail,
    createdAt: change.createdAt,
    metadata: change.metadata,
    what: {
      action: change.action ?? change.entity ?? 'event',
      entity: change.entity,
      entityId: undefined,
      metadata: change.metadata
    } satisfies BackendChangeWhat
  }
}

export function mapAuditChangeToActivity(change: BackendChangeItem, index: number): Activity {
  const normalized = normalizeBackendChange(change)
  const id = normalized.id || String(index)
  const action = normalized.action
  const what = normalized.what

  return {
    id: toNumericId(id),
    type: resolveActivityType(action),
    title: auditActionLabel(action),
    description: describeAuditChange(action, what),
    userId: normalized.actorId,
    user: normalized.actorEmail ?? 'système',
    date: new Date(normalized.createdAt ?? Date.now()),
    meta: resolveAuditMeta(what) ?? normalized.entity
  }
}

type LotTraceTimelineEntry = {
  timestamp?: string | Date
  source?: string
  type?: string
  label?: string
  status?: 'ok' | 'unavailable' | string
  payload?: Record<string, unknown>
}

type LotTraceLegacyEvent = {
  id?: string
  at?: string | Date
  source?: string
  title?: string
  description?: string
  actor?: string
}

export function mapLotTraceToUi(trace: {
  lot?: {
    lotId?: string
    ofId?: string
    productCode?: string
    siteCode?: string
    status?: string
  }
  lotNumber?: string
  lotId?: string
  ofNumber?: string
  productName?: string
  timeline?: LotTraceTimelineEntry[]
  events?: LotTraceLegacyEvent[]
}) {
  const lotId = trace.lot?.lotId ?? trace.lotId ?? trace.lotNumber ?? '—'
  const ofNumber = trace.lot?.ofId ?? trace.ofNumber ?? '—'
  const productName = trace.lot?.productCode ?? trace.productName ?? '—'

  const fromTimeline = (trace.timeline ?? []).map((entry, index) => ({
    id: `${entry.source ?? 'audit'}-${entry.type ?? 'event'}-${index}-${entry.timestamp ?? index}`,
    at: new Date(entry.timestamp ?? Date.now()),
    source: normalizeTraceSource(entry.source),
    title: entry.label ?? entry.type ?? 'Événement',
    description: describeTimelineEntry(entry),
    actor: extractActor(entry.payload)
  }))

  const fromLegacyEvents = (trace.events ?? []).map((event, index) => ({
    id: event.id ?? `event-${index}`,
    at: new Date(event.at ?? Date.now()),
    source: normalizeTraceSource(event.source),
    title: event.title ?? 'Événement',
    description: event.description ?? '',
    actor: event.actor
  }))

  return {
    lotId,
    lotNumber: trace.lotNumber ?? lotId,
    ofNumber,
    productName,
    events: [...fromTimeline, ...fromLegacyEvents]
  }
}

function normalizeTraceSource(value: string | undefined): 'production' | 'stock' | 'shipment' | 'audit' {
  if (value === 'production' || value === 'stock' || value === 'shipment' || value === 'audit') {
    return value
  }
  return 'audit'
}

function describeTimelineEntry(entry: LotTraceTimelineEntry): string {
  if (entry.status === 'unavailable') {
    return entry.label ?? 'Service indisponible'
  }
  if (!entry.payload) return ''
  const parts: string[] = []
  for (const [key, value] of Object.entries(entry.payload)) {
    if (value == null || value === '') continue
    if (key === 'actor' || key === 'performedBy' || key === 'userId') continue
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      parts.push(`${key}: ${value}`)
    }
  }
  return parts.join(' • ')
}

function extractActor(payload?: Record<string, unknown>): string | undefined {
  if (!payload) return undefined
  for (const key of ['actor', 'performedBy', 'userEmail']) {
    const value = payload[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

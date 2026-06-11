import { getMockActivities } from '~/lib/adapters/mock/audit-store'
import { getMockBatches, getMockBomOrders } from '~/lib/adapters/mock/production.mock'
import { listMockReservations } from '~/lib/adapters/mock/reservation-store'
import { getMockShipments } from '~/lib/adapters/mock/shipment.mock'
import type { LotTraceEvent, LotTraceTimeline } from '~/types'
import { ApiClientError } from '~/lib/api/envelope'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Planifié',
  in_progress: 'En cours',
  validated: 'Terminé'
}

export function buildMockLotTrace(lotNumber: string): LotTraceTimeline {
  const batch = getMockBatches().find(b => b.lotNumber === lotNumber)
  if (!batch) {
    throw new ApiClientError('NOT_FOUND', `Lot ${lotNumber} introuvable`)
  }

  const ofNumber = batch.ofNumber
  const bom = getMockBomOrders().find(o => o.ofNumber === ofNumber)
  const events: LotTraceEvent[] = []

  if (bom) {
    events.push({
      id: `of-${bom.id}`,
      at: new Date(Date.now() - 14 * 86400000),
      source: 'production',
      title: 'Ordre de fabrication ouvert',
      description: `${bom.ofNumber} — ${bom.name} (${bom.qty} u.)`,
      actor: 'Planification'
    })
  }

  events.push({
    id: `batch-create-${batch.id}`,
    at: batch.createdAt ? new Date(batch.createdAt) : new Date(Date.now() - 7 * 86400000),
    source: 'production',
    title: 'Lot créé',
    description: `${batch.lotNumber} — ${batch.productName}`,
    actor: 'Opérateur production'
  })

  for (const res of listMockReservations(ofNumber).filter(r => r.status === 'ACTIVE')) {
    events.push({
      id: `res-${res.id}`,
      at: new Date(res.createdAt),
      source: 'stock',
      title: 'Matière réservée',
      description: `${res.materialName} (${res.quantity} ${res.unit}) pour ${ofNumber}`,
      actor: 'Logistique'
    })
  }

  if (batch.status !== 'pending') {
    events.push({
      id: `batch-status-${batch.id}`,
      at: new Date(Date.now() - 3 * 86400000),
      source: 'production',
      title: `Statut : ${STATUS_LABELS[batch.status] ?? batch.status}`,
      description: `Avancement du lot ${batch.lotNumber}`,
      actor: 'Opérateur production'
    })
  }

  if (batch.hasAnomaly) {
    events.push({
      id: `batch-anomaly-${batch.id}`,
      at: new Date(Date.now() - 86400000),
      source: 'production',
      title: 'Anomalie signalée',
      description: `Non-conformité détectée sur ${batch.lotNumber}`,
      actor: 'Opérateur production'
    })
  }

  if (batch.status === 'validated') {
    events.push({
      id: `batch-ready-${batch.id}`,
      at: new Date(Date.now() - 43200000),
      source: 'shipment',
      title: 'Lot prêt à expédier',
      description: 'Contrôle qualité validé — en attente de planification logistique',
      actor: 'Système'
    })
  }

  for (const ship of getMockShipments().filter(s => s.status === 'delayed')) {
    events.push({
      id: `ship-context-${ship.id}`,
      at: new Date(ship.departureDate),
      source: 'shipment',
      title: 'Retard expédition amont',
      description: `${ship.shipmentNumber} — ${ship.client} (+${ship.delayDays} j)`,
      actor: 'Logistique'
    })
    break
  }

  const needles = [lotNumber, ofNumber, batch.productName]
  for (const act of getMockActivities()) {
    const hay = `${act.title} ${act.description} ${act.meta ?? ''}`.toLowerCase()
    if (needles.some(n => hay.includes(n.toLowerCase()))) {
      events.push({
        id: `audit-${act.id}`,
        at: new Date(act.date),
        source: 'audit',
        title: act.title,
        description: act.description,
        actor: act.user
      })
    }
  }

  events.sort((a, b) => a.at.getTime() - b.at.getTime())

  return {
    lotId: ofNumber,
    lotNumber: batch.lotNumber,
    ofNumber,
    productName: batch.productName,
    events
  }
}

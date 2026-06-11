import type { CreateReservationInput, StockLevel, StockReservation } from '~/types'

export interface ReservationStoreDeps {
  getParts: () => StockLevel[]
  setPartReserved: (reference: string, delta: number) => void
}

const reservationsStore: StockReservation[] = []
let nextReservationId = 1

export function getMockReservations(): StockReservation[] {
  return reservationsStore
}

export function seedMockReservations(items: StockReservation[]) {
  reservationsStore.length = 0
  reservationsStore.push(...items)
  nextReservationId = Math.max(nextReservationId, ...items.map(r => r.id), 0) + 1
}

export function listMockReservations(ofId?: string): StockReservation[] {
  const list = reservationsStore.map(r => ({ ...r, createdAt: new Date(r.createdAt) }))
  if (!ofId) return list
  return list.filter(r => r.ofId === ofId)
}

function findActiveReservation(ofId: string, materialId: string): StockReservation | undefined {
  return reservationsStore.find(
    r => r.ofId === ofId && r.materialId === materialId && r.status === 'ACTIVE'
  )
}

export function createMockReservations(
  input: CreateReservationInput,
  deps: ReservationStoreDeps
): StockReservation[] {
  const created: StockReservation[] = []

  for (const line of input.lines) {
    const existing = findActiveReservation(input.ofId, line.materialId)
    if (existing) {
      throw new Error(
        `${line.materialId} : déjà réservé pour l'OF ${input.ofId} (${existing.quantity} ${existing.unit})`
      )
    }
  }

  for (const line of input.lines) {
    const part = deps.getParts().find(p => p.reference === line.materialId)
    if (!part) {
      throw new Error(`Matière introuvable : ${line.materialId}`)
    }
    if (line.qty > part.available) {
      throw new Error(
        `${part.reference} : quantité demandée (${line.qty}) supérieure au disponible (${part.available} ${part.unit})`
      )
    }
  }

  for (const line of input.lines) {
    const part = deps.getParts().find(p => p.reference === line.materialId)!
    deps.setPartReserved(part.reference, line.qty)

    const reservation: StockReservation = {
      id: nextReservationId++,
      ofId: input.ofId,
      materialId: part.reference,
      materialName: part.name,
      quantity: line.qty,
      unit: part.unit,
      status: 'ACTIVE',
      createdAt: new Date()
    }
    reservationsStore.unshift(reservation)
    created.push(reservation)
  }

  return created
}

export function transitionMockReservation(
  id: number,
  status: 'RELEASED' | 'CANCELLED',
  deps: ReservationStoreDeps
): StockReservation {
  const idx = reservationsStore.findIndex(r => r.id === id)
  if (idx === -1) throw new Error('Réservation introuvable')
  const reservation = reservationsStore[idx]!
  if (reservation.status !== 'ACTIVE') {
    throw new Error('Cette réservation n\'est plus active')
  }

  deps.setPartReserved(reservation.materialId, -reservation.quantity)
  reservationsStore[idx] = { ...reservation, status }
  return { ...reservationsStore[idx]!, createdAt: new Date(reservation.createdAt) }
}

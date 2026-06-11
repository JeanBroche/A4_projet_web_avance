import { toNumericId } from '~/lib/mappers/id'

type BackendShipment = {
  id: string
  code: string
  orderNumber?: string | null
  clientCode?: string | null
  status?: string
  carrier?: string | null
  plannedShipDate?: string | Date | null
  deliveredAt?: string | Date | null
  createdAt?: string | Date
}

const STATUS_MAP: Record<string, 'loading' | 'in_transit' | 'delivered' | 'delayed'> = {
  PLANNED: 'loading',
  PICKED: 'loading',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'delayed'
}

const UI_TO_BACKEND: Record<string, string> = {
  loading: 'PICKED',
  in_transit: 'IN_TRANSIT',
  delivered: 'DELIVERED',
  delayed: 'CANCELLED'
}

export function mapShipmentToUi(shipment: BackendShipment) {
  return {
    id: toNumericId(shipment.id),
    shipmentNumber: shipment.code,
    orderNumber: shipment.orderNumber ?? undefined,
    client: shipment.clientCode ?? '—',
    address: shipment.clientCode ?? '—',
    carrier: shipment.carrier ?? 'AERONEXIS',
    status: STATUS_MAP[shipment.status ?? 'PLANNED'] ?? 'loading',
    departureDate: shipment.plannedShipDate
      ? new Date(shipment.plannedShipDate).toISOString().slice(0, 10)
      : new Date(shipment.createdAt ?? Date.now()).toISOString().slice(0, 10),
    estimatedDelivery: shipment.deliveredAt
      ? new Date(shipment.deliveredAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    delayDays: 0,
    emoji: '🚚'
  }
}

export function mapUiShipmentStatus(status: string) {
  return UI_TO_BACKEND[status] ?? status.toUpperCase()
}

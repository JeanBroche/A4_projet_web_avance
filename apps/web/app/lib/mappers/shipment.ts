import { toNumericId } from '~/lib/mappers/id'
import type { DeliveryStatus, UpdateShipmentInput } from '~/types'

type BackendShipment = {
  id: string
  code: string
  orderNumber?: string | null
  clientCode?: string | null
  status?: string
  carrier?: string | null
  deliveryAddress?: string | null
  emoji?: string | null
  plannedShipDate?: string | Date | null
  plannedDeliveryDate?: string | Date | null
  shippedAt?: string | Date | null
  deliveredAt?: string | Date | null
  createdAt?: string | Date
}

export type BackendShipmentStatus =
  | 'PLANNED'
  | 'PICKED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'

const UI_TO_BACKEND: Record<DeliveryStatus, BackendShipmentStatus> = {
  planned: 'PLANNED',
  loading: 'PICKED',
  in_transit: 'IN_TRANSIT',
  delivered: 'DELIVERED',
  delayed: 'CANCELLED'
}

function toDateInput(value?: string | Date | null): string {
  if (!value) return new Date().toISOString().slice(0, 10)
  return new Date(value).toISOString().slice(0, 10)
}

export function mapBackendStatusToUi(status: string): DeliveryStatus {
  switch (status) {
    case 'PLANNED':
      return 'planned'
    case 'PICKED':
      return 'loading'
    case 'IN_TRANSIT':
      return 'in_transit'
    case 'DELIVERED':
      return 'delivered'
    case 'CANCELLED':
      return 'delayed'
    default:
      return 'loading'
  }
}

export function mapUiShipmentStatus(status: DeliveryStatus): BackendShipmentStatus {
  return UI_TO_BACKEND[status]
}

function computeDelayDays(
  plannedDeliveryDate?: string | Date | null,
  plannedShipDate?: string | Date | null,
  status?: string
): number {
  const target = plannedDeliveryDate ?? plannedShipDate
  if (!target || status === 'DELIVERED' || status === 'CANCELLED') {
    return 0
  }
  const planned = new Date(target)
  const now = new Date()
  if (planned >= now) return 0
  return Math.ceil((now.getTime() - planned.getTime()) / (24 * 60 * 60 * 1000))
}

export function mapShipmentToUi(shipment: BackendShipment) {
  const backendStatus = shipment.status ?? 'PLANNED'
  const uiStatus = mapBackendStatusToUi(backendStatus)
  const delayDays = computeDelayDays(
    shipment.plannedDeliveryDate,
    shipment.plannedShipDate,
    backendStatus
  )

  return {
    id: toNumericId(shipment.id),
    backendId: shipment.id,
    shipmentNumber: shipment.code,
    orderNumber: shipment.orderNumber ?? undefined,
    client: shipment.clientCode ?? '—',
    address: shipment.deliveryAddress ?? '—',
    carrier: shipment.carrier ?? 'AERONEXIS',
    backendStatus,
    status: uiStatus,
    departureDate: toDateInput(shipment.shippedAt ?? shipment.plannedShipDate),
    estimatedDelivery: toDateInput(
      shipment.plannedDeliveryDate ?? shipment.deliveredAt ?? shipment.plannedShipDate
    ),
    delayDays,
    emoji: shipment.emoji ?? '🚚'
  }
}

export function mapUpdateShipmentToBackend(input: UpdateShipmentInput) {
  return {
    clientCode: input.client,
    orderNumber: input.orderNumber || undefined,
    carrier: input.carrier,
    deliveryAddress: input.address,
    plannedShipDate: input.departureDate,
    plannedDeliveryDate: input.estimatedDelivery,
    emoji: input.emoji,
    status: mapUiShipmentStatus(input.status)
  }
}

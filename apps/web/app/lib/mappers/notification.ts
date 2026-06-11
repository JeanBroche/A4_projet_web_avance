import type { AppNotification } from '~/types'

type BackendNotification = {
  id: string
  severity?: string
  title: string
  message: string
  type?: string
  read?: boolean
  createdAt: string | Date
}

const SEVERITY_MAP: Record<string, AppNotification['severity']> = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'error'
}

const SOURCE_MAP: Record<string, AppNotification['source']> = {
  stock: 'stock',
  shipment: 'shipment',
  order: 'order',
  production: 'production'
}

export function mapNotificationToUi(notification: BackendNotification): AppNotification {
  const typeKey = (notification.type ?? 'stock').toLowerCase()
  return {
    id: notification.id,
    severity: SEVERITY_MAP[notification.severity ?? 'INFO'] ?? 'info',
    title: notification.title,
    message: notification.message,
    source: SOURCE_MAP[typeKey] ?? 'stock',
    read: notification.read ?? false,
    createdAt: new Date(notification.createdAt)
  }
}

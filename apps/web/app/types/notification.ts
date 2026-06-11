export type NotificationSeverity = 'info' | 'warning' | 'error'

export interface AppNotification {
  id: string
  severity: NotificationSeverity
  title: string
  message: string
  source: 'stock' | 'shipment' | 'order' | 'production'
  read: boolean
  createdAt: Date
}

/** Canonical Kafka / Moleculer domain event topic names. */
export const DomainEvents = {
  production: {
    bomCreated: "production.bom.created",
    batchCreated: "production.batch.created",
    batchProgress: "production.batch.progress",
    batchAnomalyReported: "production.batch.anomaly_reported",
    manuOrderFinished: "production.manu_order.finished"
  },
  order: {
    created: "order.order.created",
    validated: "order.order.validated",
    rejected: "order.order.rejected",
    priorityChanged: "order.order.priority.changed",
    startProduction: "order.order.start_production",
    finished: "order.order.finished",
    shipped: "order.order.shipped",
    delivered: "order.order.delivered"
  },
  stock: {
    reserved: "stock.reserved",
    released: "stock.released",
    movementRecorded: "stock.movement.recorded",
    materialLow: "stock.material.low",
    supplierDelayReported: "stock.supplier.delay.reported"
  },
  shipment: {
    planned: "shipment.planned",
    statusChanged: "shipment.status.changed",
    deliveryAlert: "shipment.delivery.alert",
    picklistCompleted: "shipment.picklist.completed",
    picklistAutoCreated: "shipment.picklist.auto_created"
  },
  audit: {
    userActionLogged: "user.action.logged",
    incidentReported: "audit.incident.reported"
  }
} as const;

export type DomainEventTopic =
  | (typeof DomainEvents.production)[keyof typeof DomainEvents.production]
  | (typeof DomainEvents.order)[keyof typeof DomainEvents.order]
  | (typeof DomainEvents.stock)[keyof typeof DomainEvents.stock]
  | (typeof DomainEvents.shipment)[keyof typeof DomainEvents.shipment]
  | (typeof DomainEvents.audit)[keyof typeof DomainEvents.audit];

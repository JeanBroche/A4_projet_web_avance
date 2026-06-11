# Gateway — catalogue REST

Proxy HTTP 1:1 vers les actions Moleculer. Pas de BFF : le front Nuxt mappe les DTOs MS.

| HTTP | Chemin | Action MS |
|------|--------|-----------|
| `POST` | `/api/auth/login` | `auth.login` |
| `POST` | `/api/auth/refresh` | `auth.refresh` |
| `POST` | `/api/auth/logout` | `auth.logout` |
| `GET` | `/api/auth/me` | `auth.me` |
| `GET` | `/api/auth/users` | `auth.user.list` |
| `POST` | `/api/auth/users` | `auth.user.create` |
| `PATCH` | `/api/auth/users/:userId` | `auth.user.update` |
| `GET` | `/api/auth/roles` | `auth.role.list` |
| `GET` | `/api/stock/levels` | `stock.level.list` |
| `GET` | `/api/stock/levels/consolidated` | `stock.level.consolidate` |
| `POST` | `/api/stock/movements` | `stock.movement.create` |
| `GET` | `/api/stock/movements` | `stock.movement.list` |
| `POST` | `/api/stock/reservations` | `stock.reservation.create` |
| `GET` | `/api/stock/reservations` | `stock.reservation.list` |
| `POST` | `/api/stock/reservations/:id/release` | `stock.reservation.release` |
| `POST` | `/api/stock/reservations/:id/cancel` | `stock.reservation.cancel` |
| `GET` | `/api/stock/alerts` | `stock.alert.list` |
| `PUT` | `/api/stock/thresholds` | `stock.threshold.upsert` |
| `GET` | `/api/stock/forecast/rupture` | `stock.forecast.rupture` |
| `GET` | `/api/stock/supplier-delays` | `stock.supplier.delay.list` |
| `POST` | `/api/stock/supplier-delays` | `stock.supplier.delay.notify` |
| `GET` | `/api/stock/materials` | `stock.material.list` |
| `GET` | `/api/stock/materials/:materialId` | `stock.material.get` |
| `PUT` | `/api/stock/materials` | `stock.material.upsert` |
| `POST` | `/api/commercial/orders` | `order.order.create` |
| `GET` | `/api/commercial/orders/urgent` | `order.order.listUrgent` |
| `GET` | `/api/commercial/orders/history` | `order.order.history` |
| `GET` | `/api/commercial/orders/:orderId` | `order.order.get` |
| `GET` | `/api/commercial/orders/:orderId/status` | `order.order.status` |
| `PATCH` | `/api/commercial/orders/:orderId/priority` | `order.order.setPriority` |
| `GET` | `/api/commercial/orders/:orderId/delay-risk` | `order.order.delayRisk` |
| `POST` | `/api/commercial/orders/:orderId/validate` | `order.order.validate` |
| `POST` | `/api/commercial/orders/:orderId/reject` | `order.order.reject` |
| `POST` | `/api/commercial/orders/:orderId/start-production` | `order.order.startProduction` |
| `POST` | `/api/commercial/orders/:orderId/finish` | `order.order.finish` |
| `POST` | `/api/commercial/orders/:orderId/mark-shipped` | `order.order.markShipped` |
| `POST` | `/api/commercial/orders/:orderId/mark-delivered` | `order.order.markDelivered` |
| `GET` | `/api/commercial/clients` | `order.client.list` |
| `GET` | `/api/commercial/clients/:clientId` | `order.client.get` |
| `PUT` | `/api/commercial/clients` | `order.client.upsert` |
| `GET` | `/api/commercial/clients/:clientId/stats` | `order.client.stats` |
| `GET` | `/api/commercial/clients/:clientId/orders/history` | `order.order.history` |
| `GET` | `/api/production/bom` | `production.bom.list` |
| `POST` | `/api/production/bom` | `production.bom.create` |
| `GET` | `/api/production/bom/:bomCode` | `production.bom.get` |
| `PATCH` | `/api/production/bom/:bomCode` | `production.bom.update` |
| `DELETE` | `/api/production/bom/:bomCode` | `production.bom.delete` |
| `GET` | `/api/production/batches` | `production.batch.list` |
| `POST` | `/api/production/batches` | `production.batch.create` |
| `GET` | `/api/production/batches/:batchCode` | `production.batch.get` |
| `PATCH` | `/api/production/batches/:batchCode` | `production.batch.update` |
| `DELETE` | `/api/production/batches/:batchCode` | `production.batch.delete` |
| `PATCH` | `/api/production/batches/:batchCode/progress` | `production.batch.progress` |
| `PATCH` | `/api/production/batches/:batchCode/reschedule` | `production.batch.reschedule` |
| `GET` | `/api/production/batches/:batchCode/history` | `production.batch.history` |
| `GET` | `/api/production/batches/:batchCode/steps` | `production.batch.steps.list` |
| `PATCH` | `/api/production/batches/:batchCode/steps/:stepCode` | `production.batch.steps.update` |
| `POST` | `/api/production/batches/:batchId/anomalies` | `production.batch.addAnomalies` |
| `PATCH` | `/api/production/batches/:batchId/anomalies/:anomalyCode` | `production.batch.updateAnomalies` |
| `POST` | `/api/production/products` | `production.product.create` |
| `GET` | `/api/production/products/:productCode` | `production.product.get` |
| `PATCH` | `/api/production/products/:productCode` | `production.product.update` |
| `DELETE` | `/api/production/products/:productCode` | `production.product.delete` |
| `POST` | `/api/logistics/picklists` | `shipment.picklist.create` |
| `POST` | `/api/logistics/picklists/:id/complete` | `shipment.picklist.complete` |
| `POST` | `/api/logistics/shipments/plan` | `shipment.shipment.plan` |
| `GET` | `/api/logistics/shipments` | `shipment.shipment.history` |
| `GET` | `/api/logistics/shipments/:id` | `shipment.shipment.get` |
| `GET` | `/api/logistics/shipments/:id/track` | `shipment.shipment.track` |
| `PATCH` | `/api/logistics/shipments/:id/status` | `shipment.shipment.updateStatus` |
| `GET` | `/api/reporting/kpis/logistique/rupture` | `reporting.calcul.logistique.rupture` |
| `GET` | `/api/reporting/kpis/logistique/rotation` | `reporting.calcul.logistique.rotation` |
| `GET` | `/api/reporting/kpis/commercial/urgent-orders` | `reporting.calcul.commerciaux.urgentOrders` |
| `GET` | `/api/reporting/kpis/commercial/delay-risk` | `reporting.calcul.commerciaux.delayRiskOrders` |
| `GET` | `/api/reporting/kpis/finance/margin` | `reporting.calcul.finance.margin` |
| `GET` | `/api/reporting/kpis/finance/total-delay` | `reporting.calcul.finance.totalDelay` |
| `GET` | `/api/reporting/kpis/production/avancement` | `reporting.calcul.production.avancement` |
| `GET` | `/api/reporting/kpis/production/retard-lots` | `reporting.calcul.production.retardLots` |
| `GET` | `/api/audit/changes` | `audit.change.list` |
| `POST` | `/api/audit/events` | `audit.event.record` |
| `GET` | `/api/audit/events/critical` | `audit.event.listCritical` |
| `GET` | `/api/audit/lots/:lotNumber/trace` | `audit.lot.trace` |
| `GET` | `/api/audit/lots/:lotNumber/export` | `audit.lot.export` |
| `POST` | `/api/audit/documents` | `audit.document.upload` |
| `GET` | `/api/audit/documents` | `audit.document.list` |
| `GET` | `/api/audit/documents/:id/url` | `audit.document.url` |
| `GET` | `/api/notifications` | `notification.inbox.list` |
| `PATCH` | `/api/notifications/:id/read` | `notification.inbox.markRead` |
| `GET` | `/api/notifications/unread-count` | `notification.inbox.unreadCount` |

## RBAC

- Chaque microservice applique ses propres règles (`accessToken` via JWT).
- `audit.change.list` : rôle `admin` uniquement.
- Actions `reporting.calcul.*` : rôle `direction` (ou `admin`).


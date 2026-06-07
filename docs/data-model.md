# Modele de donnees AERONEXIS

Cartographie architecture cible → microservices → persistance (M1).

## Services backend et persistance

| Service | Dossier | Persistance M1 | Schema / store |
|---------|---------|----------------|----------------|
| Auth | `services/auth` | PostgreSQL | `auth` — Site, User, Role, UserRole, RefreshToken |
| Production | `services/production` | PostgreSQL | `production` — ProductStock (+ Product/BOM/MO en M3) |
| Stock | `services/stock` | PostgreSQL | `stock` — Material, StockMovement, StockReservation, StockAlert, SupplierDelay |
| Commande | `services/commande` | PostgreSQL | `commande` — Client (+ Order/OrderLine en M5) |
| Expedition | `services/expedition` | PostgreSQL | `expedition` — Delivery |
| Reporting | `services/reporting` | PostgreSQL (M7) | `reporting` — KPI_Dashboard (pas de migration M1) |
| Notification | `services/notification` | Redis + Kafka | Pas de Prisma M1 |
| Audit | `services/audit` | MongoDB | Collections `audit_logs` (issue M0 #9) |

## Organisation Prisma

- **1 PostgreSQL** Docker, **1 namespace Postgres par MS** (`@@schema("...")`).
- **`packages/db`** : outillage uniquement (`createPrismaClient`, `migrate-all`, `seed-all`).
- **Pas de FK inter-schemas** : references metier via codes string (`siteCode`, `orderNumber`, `productCode`).

## Microservice Stock (M4)

Le modele `Material` joue le role de `StockLevel` consolide : `available = currentStock - reservedStock`, `minimumStock` est le seuil utilise par les alertes. Les tables transactionnelles M4 referencent `Material.id` via FK interne au schema `stock`.

| Table | Role |
|-------|------|
| `materials` | Niveau courant + seuil, soft-delete |
| `stock_movements` | Historique entrees / sorties / ajustements (`type` IN/OUT/ADJUST) |
| `stock_reservations` | Reservations OF (`status` ACTIVE/RELEASED/CANCELLED) |
| `stock_alerts` | Alertes seuil ouvertes (resolution via `resolvedAt`) |
| `supplier_delays` | Retards fournisseur declares manuellement |

`ofId` est une reference string libre (`OF-...`) en attendant le MS production (M3).

## Soft delete

Champs `deletedAt` sur les entites metier (Site, User, Role, Material, Client, ProductStock, Delivery). Index uniques partiels PostgreSQL (`WHERE deletedAt IS NULL`) pour permettre la re-creation d'un code apres suppression logique.

Extension `@aeronexis/db` : `createSoftDeleteExtension(Prisma)` — `delete` / `deleteMany` posent `deletedAt`, les lectures excluent les lignes supprimees. Hors scope : `UserRole`, `RefreshToken` (revocation via `revokedAt`).

## Topics Kafka (cible)

| Topic | Producteur | Consommateur |
|-------|------------|--------------|
| `stock.material.low` | Stock | Notification |
| `production.manu_order.finished` | Production | Commande |
| `commande.order.finished` | Commande | Expedition |
| `expedition.delivery.alert` | Expedition | Notification |
| `user.action.logged` | Tous MS | Audit (Mongo) |

## References cross-MS (M1)

| Champ | MS | Reference future |
|-------|-----|------------------|
| `siteCode` | stock, commande, production, expedition | Site seed auth (`SITE-LYO`) |
| `productCode` | production | Product (M3) |
| `orderNumber` | expedition | Order (M5) |

## Commandes

```bash
pnpm db:migrate
pnpm db:seed
pnpm db:studio:auth
```

Voir [`packages/db/README.md`](../packages/db/README.md).

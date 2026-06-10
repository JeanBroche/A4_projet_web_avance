# Modele de donnees AERONEXIS

Cartographie architecture cible → microservices → persistance (M1).

## Services backend et persistance

| Service | Dossier | Base PG / store | Schema PG | Modeles |
|---------|---------|-----------------|-----------|---------|
| Auth | `services/auth` | `aeronexis_auth` + Redis (sessions) | `auth` | Site, User, Role, UserRole |
| Production | `services/production` | `aeronexis_production` | `production` | ProductStock (+ Product/BOM/MO en M3) |
| Stock | `services/stock` | `aeronexis_stock` | `stock` | Material, StockMovement, StockReservation, StockAlert, SupplierDelay |
| Order | `services/order` | `aeronexis_order` | `order` | Client (+ Order/OrderLine en M5) |
| Shipment | `services/shipment` | `aeronexis_shipment` | `shipment` | PickList, Shipment |
| Reporting | `services/reporting` | PostgreSQL (M7) | `reporting` | KPI_Dashboard (pas de migration M1) |
| Audit | `services/audit` | MongoDB | -- | Collections `audit_logs`, `event_history` provisionnees par [`@aeronexis/mongo-init`](../infra/mongo/init.ts) (issue M0 #9) |

## Organisation Prisma

- **5 conteneurs PostgreSQL** Docker (1 par MS Prisma), chacun avec sa base `aeronexis_<service>` via `POSTGRES_DB` au premier `docker:up` ([`infra/docker/docker-compose.yml`](../infra/docker/docker-compose.yml)).
- Chaque base contient en plus un **schema PG nomme** (`@@schema("...")` Prisma) — tables exposees comme `aeronexis_auth.auth.users`, `aeronexis_stock.stock.materials`, etc.
- Chaque service lit son URL via une env var dediee : `AUTH_DATABASE_URL`, `STOCK_DATABASE_URL`, `ORDER_DATABASE_URL`, `PRODUCTION_DATABASE_URL`, `SHIPMENT_DATABASE_URL`.
- **`packages/db`** : factory client + extension soft-delete ; orchestration optionnelle (`migrate-all`, `seed-all`).
- **Chaque MS Prisma** : scripts locaux `db:migrate`, `db:seed`, `db:studio` dans `services/<ms>/`.
- **Pas de FK inter-bases** ni inter-schemas : references metier via codes string (`siteCode`, `orderNumber`, `productCode`).

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

Extension `@aeronexis/db` : `createSoftDeleteExtension(Prisma)` — `delete` / `deleteMany` posent `deletedAt`, les lectures excluent les lignes supprimees. Hors scope : `UserRole`.

## Bus Moleculer et Redis applicatif

| Composant | Technologie | Role |
|-----------|-------------|------|
| Bus inter-services | **Kafka** (`KAFKA_BROKERS`, transporter Moleculer) | RPC (`broker.call`) et evenements (`broker.emit`) entre microservices |
| Cache KPI | **Redis** (`@aeronexis/redis-infra`) | TTL reporting (`withCache`) |
| Sessions auth | **Redis** | Refresh tokens, index sessions, blacklist JWT access |
| Verrous | **Redis** | Reservations stock, generation codes sequentiels |

Package partage : [`packages/redis-infra`](../packages/redis-infra). Config Moleculer : [`packages/moleculer-config`](../packages/moleculer-config).

Smoke bus Kafka : `pnpm smoke:kafka` (Kafka doit etre demarre via `pnpm docker:up`).

## Topics Kafka (cible metier)

| Topic | Producteur | Consommateur |
|-------|------------|--------------|
| `stock.material.low` | Stock | Notification |
| `production.manu_order.finished` | Production | Order |
| `order.order.finished` | Order | Shipment |
| `shipment.delivery.alert` | Shipment | Notification |
| `user.action.logged` | Tous MS | Audit (Mongo) |

## References cross-MS (M1)

| Champ | MS | Reference future |
|-------|-----|------------------|
| `siteCode` | stock, order, production, shipment | Site seed auth (`SITE-LYO`) |
| `productCode` | production | Product (M3) |
| `orderNumber` | shipment | Order (M5) |

## MongoDB (audit, M0 #9)

Collections provisionnees automatiquement au `docker:up` par le conteneur `mongo-init` ([`infra/mongo/init.ts`](../infra/mongo/init.ts), package `@aeronexis/mongo-init`). Script idempotent, rejouable via `pnpm mongo:init`.

| Collection | Champs documentes | Index |
|------------|-------------------|-------|
| `audit_logs` | `userId`, `action`, `entity`, `entityId`, `diff`, `ip`, `timestamp` | `{ userId: 1, timestamp: -1 }`, `{ entity: 1, entityId: 1 }` |
| `event_history` | `type`, `payload`, `correlationId`, `timestamp` | `{ correlationId: 1 }`, `{ timestamp: -1 }` |

Pas de collection `user_sessions` : les refresh tokens auth sont stockes dans **Redis** (`auth:refresh:*`, `auth:user:sessions:*`), pas en PostgreSQL.

## Commandes

```bash
pnpm docker:up      # demarre PG + Mongo (collections initialisees) + MinIO
pnpm mongo:init     # re-init des collections Mongo (idempotent)

# Par microservice (depuis services/auth, services/stock, etc.) :
pnpm db:migrate
pnpm db:seed
pnpm db:studio

# Ou tout en une fois depuis la racine :
pnpm db:migrate
pnpm db:seed
```

Voir [`packages/db/README.md`](../packages/db/README.md) et [`infra/docker/README.md`](../infra/docker/README.md).

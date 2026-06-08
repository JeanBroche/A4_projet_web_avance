# @aeronexis/db

Outillage Prisma partage du monorepo AERONEXIS. **Aucune table metier** : chaque microservice possede son propre schema Prisma, sa propre base PostgreSQL dediee, et son schema PostgreSQL nomme (`@@schema("...")`).

## Contenu

| Fichier | Role |
|---------|------|
| `src/create-client.ts` | Factory `PrismaClient` + `@prisma/adapter-pg` (Prisma 7) |
| `src/soft-delete-extension.ts` | Extension : `delete` -> `deletedAt`, lectures filtrees |
| `scripts/migrate-all.mjs` | Applique les migrations des 5 MS M1 |
| `scripts/seed-all.mjs` | Seeds auth → stock → commande → production → expedition |

## Usage dans un microservice

Chaque service passe **explicitement** son URL de connexion dediee (la factory ne lit plus `POSTGRES_URL` par defaut).

```ts
import { createPrismaClient, createSoftDeleteExtension } from "@aeronexis/db";
import { PrismaClient, Prisma } from "./generated/prisma/client.js";

const client = createPrismaClient(PrismaClient, process.env.AUTH_DATABASE_URL);
export const prisma = client.$extends(createSoftDeleteExtension(Prisma));
```

## Scripts racine

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | `migrate deploy` sur les 5 MS |
| `pnpm db:migrate:dev` | `migrate dev` sur les 5 MS |
| `pnpm db:seed` | Seeds de reference |
| `pnpm db:studio:auth` | Prisma Studio (auth) — idem `:stock`, `:commande`, `:production`, `:expedition` |

## Bases PostgreSQL (M1)

**1 container `aeronexis-postgres`**, **5 bases dediees** creees par [`infra/postgres/init.sql`](../../infra/postgres/init.sql) au premier `docker:up`. Chaque base contient le schema nomme du MS.

| MS | Base PG | Schema PG | Env var | Modeles |
|----|---------|-----------|---------|---------|
| `services/auth` | `aeronexis_auth` | `auth` | `AUTH_DATABASE_URL` | Site, User, Role, UserRole, RefreshToken |
| `services/stock` | `aeronexis_stock` | `stock` | `STOCK_DATABASE_URL` | Material |
| `services/commande` | `aeronexis_commande` | `commande` | `COMMANDE_DATABASE_URL` | Client |
| `services/production` | `aeronexis_production` | `production` | `PRODUCTION_DATABASE_URL` | ProductStock |
| `services/expedition` | `aeronexis_expedition` | `expedition` | `EXPEDITION_DATABASE_URL` | PickList, Shipment |

Services **sans Prisma M1** : `reporting` (PG M7), `notification` (Redis/Kafka), `audit` (MongoDB).

Cartographie : [`docs/data-model.md`](../../docs/data-model.md).

# @aeronexis/db

Outillage Prisma partage du monorepo AERONEXIS. **Aucune table metier** : chaque microservice possede son propre schema Prisma et namespace PostgreSQL.

## Contenu

| Fichier | Role |
|---------|------|
| `src/create-client.ts` | Factory `PrismaClient` + `@prisma/adapter-pg` (Prisma 7) |
| `src/soft-delete-extension.ts` | Extension : `delete` -> `deletedAt`, lectures filtrees |
| `scripts/migrate-all.mjs` | Applique les migrations des 5 MS M1 |
| `scripts/seed-all.mjs` | Seeds auth → stock → commande → production → expedition |

## Usage dans un microservice

```js
import { createPrismaClient, createSoftDeleteExtension } from "@aeronexis/db";
import { PrismaClient, Prisma } from "./generated/prisma/client.js";

const client = createPrismaClient(PrismaClient);
export const prisma = client.$extends(createSoftDeleteExtension(Prisma));
```

## Scripts racine

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | `migrate deploy` sur les 5 MS |
| `pnpm db:migrate:dev` | `migrate dev` sur les 5 MS |
| `pnpm db:seed` | Seeds de reference |
| `pnpm db:studio:auth` | Prisma Studio (auth) — idem `:stock`, `:commande`, `:production`, `:expedition` |

## Schemas PostgreSQL (M1)

| MS | Schema PG | Modeles |
|----|-----------|---------|
| `services/auth` | `auth` | Site, User, Role, UserRole, RefreshToken |
| `services/stock` | `stock` | Material |
| `services/commande` | `commande` | Client |
| `services/production` | `production` | ProductStock |
| `services/expedition` | `expedition` | PickList, Shipment |

Services **sans Prisma M1** : `reporting` (PG M7), `notification` (Redis/Kafka), `audit` (MongoDB).

Cartographie : [`docs/data-model.md`](../../docs/data-model.md).

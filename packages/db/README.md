# @aeronexis/db

Outillage Prisma partage du monorepo AERONEXIS. **Aucune table metier** : chaque microservice possede son propre schema Prisma, sa propre base PostgreSQL dediee, et son schema PostgreSQL nomme (`@@schema("...")`).

## Contenu

| Fichier | Role |
|---------|------|
| `src/create-client.ts` | Factory `PrismaClient` + `@prisma/adapter-pg` (Prisma 7) |
| `src/soft-delete-extension.ts` | Extension : `delete` -> `deletedAt`, lectures filtrees |
| `scripts/migrate-all.ts` | Orchestration CI/Docker : enchaine `db:migrate` de chaque MS |
| `scripts/seed-all.ts` | Orchestration : enchaine `db:seed` de chaque MS |

## Usage dans un microservice

Chaque service passe **explicitement** son URL de connexion dediee (la factory ne lit plus `POSTGRES_URL` par defaut).

```ts
import { createPrismaClient, createSoftDeleteExtension } from "@aeronexis/db";
import { PrismaClient, Prisma } from "./generated/prisma/client.js";

const client = createPrismaClient(PrismaClient, process.env.AUTH_DATABASE_URL);
export const prisma = client.$extends(createSoftDeleteExtension(Prisma));
```

## Scripts Prisma par microservice

Chaque MS Prisma expose les memes commandes **depuis son dossier** (`services/<ms>/`) :

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | `prisma migrate deploy` |
| `pnpm db:migrate:dev` | `prisma migrate dev` |
| `pnpm db:seed` | `prisma db seed` |
| `pnpm db:studio` | Prisma Studio (port fixe par MS, voir ci-dessous) |
| `pnpm db:generate` | `prisma generate` |

Exemple — travailler uniquement sur auth :

```bash
cd services/auth
pnpm db:migrate
pnpm db:seed
pnpm db:studio    # http://localhost:5555, schema PG `auth`
```

| MS | Port Studio | Schema PG | Env var |
|----|-------------|-----------|---------|
| `services/auth` | 5555 | `auth` | `AUTH_DATABASE_URL` |
| `services/stock` | 5556 | `stock` | `STOCK_DATABASE_URL` |
| `services/order` | 5557 | `order` | `ORDER_DATABASE_URL` |
| `services/production` | 5558 | `production` | `PRODUCTION_DATABASE_URL` |
| `services/shipment` | 5559 | `shipment` | `SHIPMENT_DATABASE_URL` |

## Scripts racine (orchestration optionnelle)

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | `db:migrate` sur les 5 MS (ordre : auth → stock → order → production → shipment) |
| `pnpm db:migrate:dev` | `db:migrate:dev` sur les 5 MS |
| `pnpm db:seed` | `db:seed` sur les 5 MS |
| `pnpm db:studio:auth` | Raccourci vers `pnpm --filter @aeronexis/auth run db:studio` (idem `:stock`, etc.) |

Services **sans Prisma M1** : `reporting` (PG M7), `notification` (Redis/Kafka), `audit` (MongoDB).

Cartographie : [`docs/data-model.md`](../../docs/data-model.md).

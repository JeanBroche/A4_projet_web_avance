# production

Microservice Moleculer Production (issue parent [#95](https://github.com/JeanBroche/A4_projet_web_avance/issues/95)). Gere les nomenclatures (BOM), lots de fabrication, avancement operateur, etapes, anomalies, historique et replanification.

## Pre-requis

- PostgreSQL local (`pnpm docker:up` — conteneur `postgres-production` port **5435**)
- Redis (`REDIS_URL` — inclus dans `pnpm docker:up`)
- Variables : `PRODUCTION_DATABASE_URL`, `JWT_SECRET` (voir [`.env.example`](../../.env.example))

Le service tourne en **TypeScript natif** via `tsx` (pas de compilation `dist` en dev), comme `stock` et `order`.

## Scripts Prisma (depuis `services/production`)

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | Appliquer les migrations (`schema production`) |
| `pnpm db:migrate:dev` | Creer / appliquer une migration en dev |
| `pnpm db:seed` | Donnees de reference (PROD-001, BOM-SEED-001, BATCH-SEED-001) |
| `pnpm db:studio` | Prisma Studio — <http://localhost:5558> |
| `pnpm db:generate` | Regenerer le client |

## Lancer le service

```bash
cd services/production
pnpm db:migrate
pnpm db:seed
pnpm dev

# ou depuis la racine :
pnpm dev:production
```

## Actions Moleculer

| Action | Role | Description |
|--------|------|-------------|
| `production.ping` | public | Healthcheck |
| `production.bom.create` | operateur | Cree une nomenclature (code auto-genere) |
| `production.bom.list` | operateur | Liste les nomenclatures |
| `production.bom.get` | operateur | Detail nomenclature |
| `production.bom.update` | operateur | Met a jour nomenclature / statut |
| `production.bom.delete` | operateur | Suppression logique |
| `production.batch.create` | operateur | Cree un lot + etapes par defaut |
| `production.batch.list` | operateur | Liste les lots (filtre bom_code, status) |
| `production.batch.get` | operateur | Detail lot |
| `production.batch.update` | operateur | Met a jour lot / statut |
| `production.batch.delete` | operateur | Suppression logique |
| `production.batch.progress` | operateur | Declarer avancement 0-100% |
| `production.batch.reschedule` | operateur | Replanification manuelle (dates prevues) |
| `production.batch.history` | operateur | Historique des actions sur un lot |
| `production.batch.steps.list` | operateur | Etapes de fabrication du lot |
| `production.batch.steps.update` | operateur | Met a jour le statut d'une etape |
| `production.batch.addAnomalies` | operateur | Signaler une anomalie |
| `production.batch.updateAnomalies` | operateur | Mettre a jour / cloturer une anomalie |
| `production.product.create` | operateur | Stock produit fini |
| `production.product.get` | operateur | Lecture produit fini |
| `production.product.update` | operateur | Mise a jour produit fini |
| `production.product.delete` | operateur | Suppression logique |

Toutes les ecritures exigent le role `operateur` (le role `admin` passe partout). Le token est lu depuis `ctx.params.accessToken` ou `ctx.meta.authorization` (`Bearer <token>`).

### Workflow statuts lot

`PENDING` -> `IN_PROGRESS` -> `COMPLETED`

Annulation : `PENDING` ou `IN_PROGRESS` -> `CANCELLED`

L'avancement (`batch.progress`) met automatiquement le lot en `IN_PROGRESS` si percent > 0, et `COMPLETED` si percent = 100.

## Validation manuelle (CLI)

```bash
# 1. Obtenir un token operateur via le service auth
cd services/auth
pnpm exec moleculer call auth.login --email operateur@aeronexis.local --password $env:SEED_ADMIN_PASSWORD

# 2. Lister les nomenclatures
cd ../production
pnpm exec moleculer call production.bom.list --accessToken <token>

# 3. Declarer l'avancement d'un lot
pnpm exec moleculer call production.batch.progress `
  --accessToken <token> `
  --batch_code BATCH-SEED-001 `
  --percent 75

# 4. Signaler une anomalie (batch_id = UUID du lot)
pnpm exec moleculer call production.batch.addAnomalies `
  --accessToken <token> `
  --batch_id <batchId> `
  --description "Ecart de tolerance"

# 5. Historique du lot
pnpm exec moleculer call production.batch.history --accessToken <token> --batch_code BATCH-SEED-001
```

L'exposition HTTP des actions production (`/api/v1/production/*`) est hors scope de ce livrable.

## Tests

```bash
pnpm --filter @aeronexis/production test
```

Les tests sautent automatiquement si PostgreSQL n'est pas disponible. Ils utilisent le seed M3 (BOM-SEED-001, BATCH-SEED-001) et forgent localement les JWT pour valider le RBAC.

## Kafka

La publication d'evenements (`bom.created`, `batch.created`, `batch.progress`, `batch.anomaly_reported`) est branchee via [`src/lib/events.ts`](src/lib/events.ts) en mode stub (`production.event.pending`).

## Docker

Le service est inclus dans `docker-compose.apps.yml` :

```bash
pnpm docker:apps:up
```

Base dediee : `aeronexis_production` sur le conteneur `postgres-production`.

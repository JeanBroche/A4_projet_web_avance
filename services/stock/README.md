# stock

Microservice Moleculer Stock (issue parent [#96](https://github.com/JeanBroche/A4_projet_web_avance/issues/96), sous-issues #30 a #36). Gere les niveaux multi-sites, mouvements, reservations, alertes seuil, anticipation de ruptures et retards fournisseur.

## Pre-requis

- PostgreSQL local (`pnpm docker:up`)
- Variables : `STOCK_DATABASE_URL`, `JWT_SECRET`, `SEED_ADMIN_PASSWORD` (voir [`.env.example`](../../.env.example))

## Scripts Prisma (depuis `services/stock`)

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | Appliquer les migrations (`schema stock`) |
| `pnpm db:migrate:dev` | Creer / appliquer une migration en dev |
| `pnpm db:seed` | Donnees de reference |
| `pnpm db:studio` | Prisma Studio — <http://localhost:5556> (schema `stock`) |
| `pnpm db:generate` | Regenerer le client |

## Lancer le service

```bash
cd services/stock
pnpm db:migrate
pnpm db:seed
pnpm dev              # depuis ce dossier

# ou depuis la racine :
pnpm dev:stock        # ou pnpm dev:backend (auth + stock + order + production + shipment + reporting)
```

## Actions Moleculer

| Action | Role | Description |
|--------|------|-------------|
| `stock.ping` | public | Healthcheck |
| `stock.level.list` | auth | Niveaux par site (filtre `siteCode`, `code`) |
| `stock.level.consolidate` | auth | Aggregation multi-sites par matiere |
| `stock.movement.create` | logistique | Enregistre une entree / sortie / ajustement |
| `stock.movement.list` | auth | Historique paginated |
| `stock.reservation.create` | logistique | Reserve un OF, transaction atomique |
| `stock.reservation.release` | logistique | Libere une reservation active |
| `stock.reservation.cancel` | logistique | Annule une reservation active |
| `stock.alert.list` | logistique, direction | Alertes seuil (re-evalue avant retour) |
| `stock.threshold.upsert` | logistique | Met a jour `Material.minimumStock` |
| `stock.forecast.rupture` | logistique, direction | Score 0-100 de risque rupture (fenetre 30j par defaut) |
| `stock.supplier.delay.list` | auth | Retards fournisseur declares |
| `stock.supplier.delay.notify` | logistique | Declare un retard |

Toutes les ecritures exigent le role `logistique` (le role `admin` passe partout). Les lectures `alert.list` et `forecast.rupture` exigent `logistique` ou `direction` ; les autres lectures exigent un JWT valide. Isolation multi-site via le code site embarque dans le JWT (`siteId`). Le token est lu depuis `ctx.params.accessToken` ou `ctx.meta.authorization` (`Bearer <token>`).

## Validation manuelle

```bash
# 1. Obtenir un token logistique via le service auth
cd services/auth
pnpm exec moleculer call auth.login --email logistique@aeronexis.local --password $env:SEED_ADMIN_PASSWORD

# 2. Lister les niveaux
cd ../stock
pnpm exec moleculer call stock.level.list --accessToken <token> --siteCode SITE-LYO

# 3. Reserver
pnpm exec moleculer call stock.reservation.create `
  --accessToken <token> `
  --ofId OF-2025-001 `
  --lines '[{"materialId":"<id>","qty":3}]'
```

L'exposition HTTP des actions stock (`/api/stock/*` via le gateway moleculer-web) est hors scope de ce livrable et sera traitee dans une issue gateway dediee.

## Tests

```bash
pnpm --filter @aeronexis/stock test
```

Les tests sautent automatiquement si PostgreSQL n est pas disponible. Ils utilisent le seed M4 (matieres SITE-LYO + SITE-PAR, alerte sur MAT-002) et forgent localement les JWT pour valider le RBAC sans depasser le scope du microservice.

## Kafka

La publication d evenements (`stock.reserved`, `stock.movement.recorded`, `stock.supplier.delay.reported`...) est branchee via [`src/lib/events.ts`](src/lib/events.ts).

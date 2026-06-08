# commande

Microservice Moleculer Commandes (issue parent [#97](https://github.com/JeanBroche/A4_projet_web_avance/issues/97), sous-issues #39 a #44). Gere les commandes client, priorisation urgences, suivi delais, statistiques commerciales et workflow validation.

## Pre-requis

- PostgreSQL local (`pnpm docker:up`)
- Variables : `COMMANDE_DATABASE_URL`, `JWT_SECRET` (voir [`.env.example`](../../.env.example))

## Lancer le service

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev:commande        # ou pnpm dev:backend (api + auth + stock + commande)
```

## Actions Moleculer

| Action | Role | Description |
|--------|------|-------------|
| `commande.ping` | public | Healthcheck |
| `commande.order.create` | commercial | Cree une commande CMD-YYYY-NNNNN en statut DRAFT |
| `commande.order.get` | auth | Detail commande + lignes + client |
| `commande.order.status` | auth | Timeline historique statuts |
| `commande.order.setPriority` | commercial | Marque urgent + date limite |
| `commande.order.listUrgent` | auth | File prioritaire (urgent=true) |
| `commande.order.delayRisk` | auth | Score 0-100 + facteurs de retard (V1 sans M3) |
| `commande.client.stats` | auth | CA, nb commandes, delai moyen |
| `commande.order.history` | auth | Historique pagine par client/site |
| `commande.order.validate` | commercial | DRAFT -> VALIDATED + historique |
| `commande.order.reject` | commercial | DRAFT -> REJECTED (motif obligatoire) |

Toutes les ecritures exigent le role `commercial` (le role `admin` passe partout). Les lectures exigent un JWT valide quel que soit le role. Le token est lu depuis `ctx.params.accessToken` ou `ctx.meta.authorization` (`Bearer <token>`).

### Workflow statuts

`DRAFT` -> `VALIDATED` -> `IN_PRODUCTION` -> `SHIPPED` -> `DELIVERED`

Rejet : `DRAFT` -> `REJECTED`

## Validation manuelle

```bash
# 1. Obtenir un token commercial via le service auth
cd services/auth
pnpm exec moleculer call auth.login --email commercial@aeronexis.local --password $env:SEED_ADMIN_PASSWORD

# 2. Creer une commande
cd ../commande
pnpm exec moleculer call commande.order.create `
  --accessToken <token> `
  --clientId <clientId> `
  --siteCode SITE-LYO `
  --lines '[{"productCode":"PROD-001","quantity":2,"unitPrice":125000}]'

# 3. Valider la commande
pnpm exec moleculer call commande.order.validate --accessToken <token> --orderId <orderId>

# 4. Lister les urgences
pnpm exec moleculer call commande.order.listUrgent --accessToken <token> --siteCode SITE-LYO
```

L'exposition HTTP des actions commande (`/api/v1/commercial/*` via le gateway moleculer-web) est hors scope de ce livrable et sera traitee dans une issue gateway dediee.

## Tests

```bash
pnpm --filter @aeronexis/commande test
```

Les tests sautent automatiquement si PostgreSQL n est pas disponible. Ils utilisent le seed M5 (client CLI-001, commandes CMD-2025-00001/00002) et forgent localement les JWT pour valider le RBAC.

## Kafka

La publication d evenements (`order.created`, `order.priority.changed`, `order.validated`) est branchee via [`src/lib/events.ts`](src/lib/events.ts).

## delayRisk (V1)

Le calcul de risque de retard s appuie sur la date promise, l urgence et le statut commande. L enrichissement via ordres de fabrication (M3 / `production_orders`) sera ajoute quand le microservice production sera disponible.

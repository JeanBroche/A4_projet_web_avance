# reporting

Microservice Moleculer reporting — KPI tableaux de bord direction (milestone M7, [issue #103](https://github.com/JeanBroche/A4_projet_web_avance/issues/103)).

Pas de schema Prisma dedie : les indicateurs sont calcules a la volee en agregant les microservices `stock`, `commande` et `production`. Un cache Redis optionnel (TTL 5 min) reduit la charge downstream.

## RBAC

Toutes les actions `calcul.*` requierent le role `direction` (le role `admin` continue de passer via `requireAnyRole`). L authentification est portee par le parametre `accessToken` ou par les meta Moleculer (`ctx.meta.authorization`).

`callDownstream` relaye le JWT direction vers les MS appeles. Chaque MS applique ses propres regles de lecture :

| MS | Actions KPI | Roles autorises |
|----|-------------|-----------------|
| stock | `alert.list`, `forecast.rupture` | `logistique`, `direction` |
| commande | `order.listUrgent`, `order.history` | `commercial`, `direction` |
| production | `batch.list` (lecture seule) | `operateur`, `direction` |

Les ecritures production restent reservees a `operateur` : la direction peut lire les lots pour les KPI, pas les modifier.

Seed test : `direction@aeronexis.local` (cf. [`services/auth/prisma/seed.ts`](../auth/prisma/seed.ts), mot de passe `SEED_ADMIN_PASSWORD`).

## Actions

Les noms d actions et de fichiers existants sont conserves. Le mapping vers les sous-issues de #103 est documente ci-dessous.

| Action | Famille KPI #103 | Source downstream | Sortie principale |
|--------|------------------|-------------------|--------------------|
| `reporting.calcul.logistique.rupture` | #55 logistique | `stock.alert.list` | `totalRuptureProducts`, `materials` |
| `reporting.calcul.logistique.rotation` | #55 logistique | `stock.forecast.rupture` | `averageConsumptionPerDay`, `atRiskMaterials` |
| `reporting.calcul.commerciaux.urgentOrders` | #56 commerciaux | `commande.order.listUrgent` | `totalUrgentOrders`, `orders` |
| `reporting.calcul.commerciaux.delayRiskOrders` | #56 commerciaux | `commande.order.history` | `totalDelayRiskOrders`, `orders` |
| `reporting.calcul.finance.margin` | #57 finance | `commande.order.history` | `totalRevenue`, `estimatedCost`, `margin` |
| `reporting.calcul.finance.totalDelay` | #57 finance | `commande.order.history` | `totalDelays`, `estimatedDelayCost` |
| `reporting.calcul.production.avancement` | #54 production | `production.batch.list` | `totalActiveBatches`, `averageProgress` |
| `reporting.calcul.production.retardLots` | #54 production | `production.batch.list` | `lateBatches`, `batches` |

### Parametres communs

- `accessToken` : JWT direction/admin (sinon `FORBIDDEN`).
- `siteCode` (optionnel) : filtre par site.
- `windowDays` (optionnel, defaut 30) : fenetre d agregation pour `rotation`, `delayRiskOrders`, `margin`, `totalDelay`.

### Coefficients metier

`calcul.finance.margin` applique un ratio cout/CA de 65 % (faute de module finance dedie) et `calcul.finance.totalDelay` une penalite forfaitaire de 5 000 centimes par commande en retard active. Ces coefficients sont definis dans [`services/actions/calculFinance.ts`](services/actions/calculFinance.ts) et seront recalibres lors de l implementation reelle de l issue #57.

## Cache

Le helper `withCache` ([`src/lib/cache.ts`](src/lib/cache.ts)) memorise les resultats sous la cle `reporting:<action>:<params>` avec un TTL de 300 s. Si `REDIS_URL` est absent ou inaccessible, le cache est desactive sans erreur et chaque appel recalcule.

## Helpers partages

- [`src/lib/schemas.ts`](src/lib/schemas.ts) : `baseKpiSchema`, `windowedKpiSchema` Zod.
- [`src/lib/downstream.ts`](src/lib/downstream.ts) : `callDownstream(ctx, action, params, accessToken)` propage le JWT vers les MS appeles.
- [`src/lib/cache.ts`](src/lib/cache.ts) : `withCache(service, action, params, compute)`.

## Demarrage

```bash
pnpm docker:up
pnpm db:migrate && pnpm db:seed
pnpm dev:backend
```

Le service ecoute via le transporter Redis configure dans `@aeronexis/moleculer-config`.

## Verification CLI

```bash
# Recuperer un token direction
TOKEN=$(node --import tsx -e "import('@aeronexis/services-shared').then(m=>console.log(m.signAccessToken({sub:'cli',email:'direction@aeronexis.local',siteId:'SITE-LYO',roles:['direction']})))")

cd services/reporting
pnpm exec moleculer call reporting.calcul.logistique.rupture --accessToken $TOKEN --siteCode SITE-LYO
pnpm exec moleculer call reporting.calcul.production.avancement --accessToken $TOKEN
```

## Tests

```bash
pnpm --filter @aeronexis/reporting test
```

Les tests d integration utilisent un broker Moleculer en memoire et des mocks pour `stock`, `commande`, `production` (cf. [`tests/reporting.actions.test.ts`](tests/reporting.actions.test.ts)). Ils couvrent les 8 actions `calcul.*`, le bypass `admin` et le refus du role `commercial`.

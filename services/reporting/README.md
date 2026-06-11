# reporting

Microservice Moleculer reporting — KPI tableaux de bord direction (milestone M7, [issue #103](https://github.com/JeanBroche/A4_projet_web_avance/issues/103)).

Pas de schema Prisma dedie : les indicateurs sont calcules a la volee en agregant les microservices `stock`, `order` et `production`. Un cache Redis optionnel (TTL 5 min) reduit la charge downstream.

## RBAC

Toutes les actions `calcul.*` requierent le role `direction` (le role `admin` continue de passer via `requireAnyRole`). L authentification est portee par le parametre `accessToken` ou par les meta Moleculer (`ctx.meta.authorization`).

`callDownstream` relaye le JWT direction vers les MS appeles. Chaque MS applique ses propres regles de lecture :

| MS | Actions KPI | Roles autorises |
|----|-------------|-----------------|
| stock | `alert.list`, `forecast.rupture` | `logistique`, `direction` |
| order | `order.listUrgent`, `order.history` | `commercial`, `direction` |
| production | `batch.list` (lecture seule) | `operateur`, `direction` |

Les ecritures production restent reservees a `operateur` : la direction peut lire les lots pour les KPI, pas les modifier.

Seed test : `direction@aeronexis.local` (cf. [`services/auth/prisma/seed.ts`](../auth/prisma/seed.ts), mot de passe `SEED_ADMIN_PASSWORD`).

## Actions

Les noms d actions et de fichiers existants sont conserves. Le mapping vers les sous-issues de #103 est documente ci-dessous.

| Action | Famille KPI #103 | Source downstream | Sortie principale |
|--------|------------------|-------------------|--------------------|
| `reporting.calcul.logistique.rupture` | #55 logistique | `stock.alert.list` | `totalRuptureProducts`, `materials` |
| `reporting.calcul.logistique.rotation` | #55 logistique | `stock.forecast.rupture` | `averageConsumptionPerDay`, `atRiskMaterials` |
| `reporting.calcul.commerciaux.urgentOrders` | #56 commerciaux | `order.order.listUrgent` | `totalUrgentOrders`, `orders` |
| `reporting.calcul.commerciaux.delayRiskOrders` | #56 commerciaux | `order.order.history` | `totalDelayRiskOrders`, `orders` |
| `reporting.calcul.finance.margin` | #57 finance | `order.order.history` | `totalRevenue`, `estimatedCost`, `margin` |
| `reporting.calcul.finance.totalDelay` | #57 finance | `order.order.history` | `totalDelays`, `estimatedDelayCost` |
| `reporting.calcul.production.avancement` | #54 production | `production.batch.list` | `totalActiveBatches`, `averageProgress` |
| `reporting.calcul.production.retardLots` | #54 production | `production.batch.list` | `lateBatches`, `batches` |

### Parametres communs

- `accessToken` : JWT direction/admin (sinon `FORBIDDEN`).
- `siteCode` (optionnel) : filtre par site.
- `windowDays` (optionnel, defaut 30) : fenetre d agregation pour `rotation`, `delayRiskOrders`, `margin`, `totalDelay`.

### KPI finance (V1 — estimations)

Les actions `calcul.finance.margin` et `calcul.finance.totalDelay` couvrent la famille #57 finance en **attendant un module finance dedie** ([issue #57](https://github.com/JeanBroche/A4_projet_web_avance/issues/57)). Elles ne lisent pas de comptabilite reelle : les chiffres sont **des approximations documentees**, utiles pour le tableau de bord direction mais non auditables financierement.

| Action | Donnees source | Hypotheses V1 | Limites connues |
|--------|----------------|---------------|-----------------|
| `calcul.finance.margin` | `order.order.history` (CA estime par commande) | Ratio cout/CA fixe a **65 %** (`KPI_COST_RATIO`, voir [`src/lib/kpi-config.ts`](src/lib/kpi-config.ts)) | Pas de couts reels BOM, pas de charges fixes, pas de marge par produit |
| `calcul.finance.totalDelay` | commandes actives en retard dans la fenetre | Penalite forfaitaire **5 000 centimes** par commande en retard (`KPI_DELAY_PENALTY_CENTS`) | Pas de penalites contractuelles client, pas de SLA par client |

**Reponse attendue en soutenance :** la direction dispose deja d'indicateurs finance **indicatifs** ; la V2 remplacera les coefficients par un microservice finance ou des exports comptables. Les KPI logistique, commercial et production, eux, s'appuient sur des donnees operationnelles reelles.

### Coefficients metier (implementation)

Les coefficients sont centralises dans [`src/lib/kpi-config.ts`](src/lib/kpi-config.ts) et utilises par [`services/actions/finance-metrics.ts`](services/actions/finance-metrics.ts). Ils seront recalibres lors de l'implementation reelle de l'issue #57.

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

Le service ecoute via le transporter **Kafka** configure dans `@aeronexis/moleculer-config` (Redis sert uniquement au cache KPI).

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

Les tests d integration utilisent un broker Moleculer en memoire et des mocks pour `stock`, `order`, `production` (cf. [`tests/reporting.actions.test.ts`](tests/reporting.actions.test.ts)). Ils couvrent les 8 actions `calcul.*`, le bypass `admin` et le refus du role `commercial`.

# web — Frontend AERONEXIS

Application Nuxt du monorepo AERONEXIS Dynamics (issue [#6](https://github.com/JeanBroche/A4_projet_web_avance/issues/6)).

## Demarrage

Depuis la **racine** du monorepo :

```bash
pnpm dev:web
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

## Architecture front (mock → Moleculer)

```
Pages → Composables métier → Adapters (mock | moleculer) → API / fixtures
```

| Couche | Dossier | Rôle |
|--------|---------|------|
| Types | `app/types/` | Contrats alignés sur les actions Moleculer |
| Fixtures | `app/fixtures/` | Données de démo (phase mock) |
| Adapters mock | `app/lib/adapters/mock/` | CRUD en mémoire + délai réseau simulé |
| Adapters Moleculer | `app/lib/adapters/moleculer/` | Stubs HTTP (actifs quand gateway #5 prête) |
| Composables | `app/composables/use*.ts` | État, loading/error, mutations |
| Auth | `app/middleware/auth.global.ts` | Session + RBAC par route |

### Sélection de l'adapter

Variable d'environnement :

```bash
NUXT_PUBLIC_API_ADAPTER=mock      # défaut — données fixtures
NUXT_PUBLIC_API_ADAPTER=moleculer   # requiert apps/gateway sur :4000
```

### Comptes démo (mock)

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `admin@aeronexis.local` | `admin123` | admin |
| `operateur@aeronexis.local` | `operateur123` | operateur |
| `logistique@aeronexis.local` | `logistique123` | logistique |
| `commercial@aeronexis.local` | `commercial123` | commercial |
| `direction@aeronexis.local` | `direction123` | direction |

Pour changer de persona en démo, se déconnecter puis se reconnecter avec un autre compte (voir tableau ci-dessus).

## Mapping page → composable → action Moleculer

| Page | Composable | Adapter mock | Action Moleculer (phase 2) |
|------|------------|--------------|----------------------------|
| `/` | `useAuth` | `auth.mock` | `auth.login` |
| `/inventaire/spare` | `useStock` | `stock.mock` | `stock.level.list`, `stock.threshold.upsert` |
| `/inventaire/returned` | `useStock` | `stock.mock` | `stock.movement.create` (type return) |
| `/bom` | `useProduction` | `production.mock` | `production.bom.list/create` |
| `/batch` | `useProduction` | `production.mock` | `production.batch.*`, `batch.addAnomalies` |
| `/commands` | `useOrders` | `order.mock` | `order.create`, `order.status`, `order.validated`, `order.rejected`, `order.priority.changed` |
| `/delivery` | `useShipments` | `shipment.mock` | `shipment.updateStatus` |
| `/activity` | `useAudit` | `audit.mock` | `audit.change.list` |
| `/dashboard` | `useReporting` | `reporting.mock` | `reporting.calcul.*` |

## Proxy API

En développement, les requêtes vers `/api/*` sont proxifiées vers la gateway Moleculer (`moleculer-web`, issue #5) sur `http://localhost:4000`.

```bash
curl http://localhost:3000/api/health
```

## Layouts

Layout principal : `sidebar` (navigation filtrée par rôle RBAC).

Layouts squelettes par espace métier dans `app/layouts/` : `production`, `logistique`, `commercial`, `direction` (non utilisés pour l'instant).

## Scripts

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Vérification TypeScript |

## Scénario soutenance (15 min)

Enchaînement recommandé pour démontrer l'architecture sans backend Moleculer :

| Étape | Compte | Page | Preuve architecture |
|-------|--------|------|---------------------|
| 1 | `operateur@` | `/` → `/batch` | Login Zod + middleware RBAC (`auth.global.ts`) |
| 2 | `operateur@` | `/batch` | Ouvrir un lot, signaler / lever une anomalie → `useProduction` → `production.mock` |
| 3 | Déconnexion → `logistique@` | `/inventaire/spare` | RBAC : nav filtrée par rôle de session |
| 4 | `logistique@` | `/inventaire/spare` | Filtre rupture, création pièce validée Zod → `useStock` |
| 5 | Déconnexion → `commercial@` | `/commands` | Valider CMD-2026-092 (pending), changer priorité → `order.validated` / `order.priority.changed` |
| 6 | Déconnexion → `direction@` | `/dashboard` | KPI calculés depuis les stores mock (`reporting.mock`) |
| 7 | `direction@` | `/activity` | Nouvelles entrées audit après mutations (login, stock, commandes, lots) |

Points à mentionner au jury :

- Bascule `NUXT_PUBLIC_API_ADAPTER=moleculer` sans réécrire les pages (même interfaces adapter).
- Proxy dev `/api` → gateway `:4000` ; client HTTP avec Bearer + `X-Correlation-Id` + enveloppe `ApiResult`.
- Validation Zod sur login et modales de création (batch, stock, commande).
- Journal d'audit mock alimenté par `audit.append` depuis les mutations métier.

## Passage à Moleculer (checklist)

1. Implémenter `apps/gateway` (moleculer-web)
2. `NUXT_PUBLIC_API_ADAPTER=moleculer`
3. Vérifier les routes dans `app/lib/adapters/moleculer/`
4. Aucune modification des pages si les interfaces adapter sont stables

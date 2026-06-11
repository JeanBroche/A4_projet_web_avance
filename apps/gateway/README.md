# gateway

API Gateway HTTP (Moleculer `moleculer-web`, issue [#5](https://github.com/JeanBroche/A4_projet_web_avance/issues/5)).

Expose les microservices Moleculer en **REST** sur le port **4000** (`/api/*`), avec validation JWT. Auth login/refresh/logout passent par une facade gateway qui pose des cookies HttpOnly ; le reste est un proxy 1:1 vers les MS (le front mappe les DTOs dans `apps/web/app/lib/mappers/`).

## Prérequis

- Infra locale : `pnpm docker:up` (Kafka, Redis, PostgreSQL…)
- Microservices démarrés : `pnpm dev:backend`
- Fichier `.env` à la racine (voir `.env.example`)

## Lancer la gateway

```bash
# depuis la racine
pnpm dev:gateway

# valider le catalogue REST contre les actions MS
pnpm --filter @aeronexis/gateway validate:routes

# régénérer ROUTES.md
pnpm --filter @aeronexis/gateway routes:doc

# smoke test (gateway + MS requis)
pnpm --filter @aeronexis/gateway smoke:health
```

## Front Nuxt en mode Moleculer

```bash
NUXT_PUBLIC_API_ADAPTER=moleculer pnpm dev:web
```

Le proxy Nitro redirige `/api/*` vers `http://localhost:4000`.

## Architecture

| Couche | Rôle |
|--------|------|
| **Gateway** | Proxy HTTP → action Moleculer ; facade auth (cookies HttpOnly) |
| **Front Nuxt** | Adapters `moleculer/*` + mappers + orchestration UI |

Catalogue complet : [`ROUTES.md`](./ROUTES.md).

## Endpoints principaux

| Préfixe | Service MS |
|---------|------------|
| `/api/auth/*` | auth |
| `/api/stock/*` | stock |
| `/api/commercial/*` | order |
| `/api/production/*` | production |
| `/api/logistics/*` | shipment |
| `/api/reporting/kpis/*` | reporting (`calcul.*`) |
| `/api/audit/*` | audit |
| `/api/notifications` | notification |

RBAC appliqué dans chaque microservice ; la gateway vérifie le JWT sur toutes les routes protégées (cookie `aeronexis_access_token` ou header `Authorization: Bearer`).

## Healthcheck

`GET /health` retourne l'état de la gateway et ping les 8 microservices critiques (`auth`, `stock`, `order`, `production`, `shipment`, `audit`, `notification`, `reporting`). Réponse `ok` ou `degraded` avec latence par service. Voir [`docs/supervision.md`](../../docs/supervision.md).

## Auth cookies

- `POST /api/auth/login` pose `aeronexis_access_token` et `aeronexis_refresh_token` (HttpOnly, SameSite=Lax).
- Le front Nuxt envoie les cookies via `credentials: include` (proxy `/api` same-origin).
- En dev HTTP : `COOKIE_SECURE=false` (voir `.env.example`). En production HTTPS : `COOKIE_SECURE=true`.

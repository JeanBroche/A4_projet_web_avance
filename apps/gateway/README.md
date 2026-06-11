# gateway

API Gateway HTTP (Moleculer `moleculer-web`, issue [#5](https://github.com/JeanBroche/A4_projet_web_avance/issues/5)).

Expose les microservices Moleculer en **REST 1:1** sur le port **4000** (`/api/*`), avec validation JWT. Pas de BFF : le front Nuxt appelle ces routes et mappe les DTOs MS localement (`apps/web/app/lib/mappers/`).

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
| **Gateway** | Proxy HTTP → action Moleculer (DTO brut MS) |
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

RBAC appliqué dans chaque microservice ; la gateway vérifie le JWT sur toutes les routes protégées.

# Supervision et observabilite

Ce document resume les mecanismes de supervision disponibles dans AERONEXIS (backend + gateway), leurs limites actuelles, et comment les presenter en soutenance.

## Healthchecks

### Gateway agregée

`GET /health` (port 4000) ping les 8 microservices critiques via `{service}.ping` :

- `auth`, `stock`, `order`, `production`, `shipment`, `audit`, `notification`, `reporting`

Reponse :

- `status: "ok"` — tous les services repondent `pong`
- `status: "degraded"` — au moins un service est indisponible, en timeout ou repond une erreur

Implementation : [`apps/gateway/src/health.ts`](../apps/gateway/src/health.ts).

Timeout configurable : `GATEWAY_HEALTH_TIMEOUT_MS` (defaut 3000 ms).

### Microservices

Chaque microservice expose une action publique `{service}.ping` retournant `"pong"`.

### Infrastructure Docker

Les conteneurs infra definissent des `healthcheck` dans [`infra/docker/docker-compose.yml`](../infra/docker/docker-compose.yml) :

| Service | Verification |
|---------|--------------|
| PostgreSQL (x5) | `pg_isready` |
| MongoDB | `mongosh` ping |
| Redis | `redis-cli ping` |
| Kafka | broker API |
| MinIO | `/minio/health/live` |

Les microservices applicatifs demarrent apres les dependances saines (`depends_on: condition: service_healthy`).

## Tracabilite des requetes

Le middleware **correlation-id** ([`packages/moleculer-config/src/middlewares/correlation-id.ts`](../packages/moleculer-config/src/middlewares/correlation-id.ts)) :

1. Lit `x-correlation-id` ou `x-request-id` depuis la gateway
2. Genere un UUID sinon
3. Propage `ctx.meta.correlationId` sur tous les appels Moleculer downstream
4. Inclut l'identifiant dans les logs JSON et les enveloppes d'erreur HTTP

La gateway transmet ces en-tetes via [`apps/gateway/src/http.ts`](../apps/gateway/src/http.ts).

## Audit et evenements metier

| Couche | Role supervision |
|--------|------------------|
| **MongoDB audit** | Journal des actions utilisateur, incidents critiques, timeline lot (`audit.lot.trace`) |
| **Domain events Kafka/Moleculer** | Chaine asynchrone production → order → shipment → notification |
| **Logs JSON Moleculer** | Niveau `LOG_LEVEL` (defaut `info`), format structure |

Smoke tests disponibles :

```bash
pnpm --filter @aeronexis/gateway smoke:health
pnpm smoke:kafka
pnpm smoke:cross-service
```

## Limites actuelles (a assumer en soutenance)

| Attendu academique | Etat actuel |
|--------------------|-------------|
| Supervision des flux | Healthchecks + correlation ID + audit ; pas de dashboard ops |
| Metriques / KPIs ops | KPIs metier direction (`reporting`) ; pas Prometheus/Grafana |
| Alerting ops | Notifications metier (stock, expédition) ; pas PagerDuty |
| Tracing distribue | Correlation ID uniquement ; pas Jaeger/Zipkin |
| Temps reel | REST polling ; pas WebSocket |

**Argumentaire :** la plateforme couvre la supervision **metier** (traçabilite lot, incidents, KPI direction) et les fondations **techniques** (healthchecks, correlation, logs structures). La supervision **infrastructure** (APM, metriques, alerting ops) est volontairement hors scope V1 et constitue une evolution naturelle (issue future ou extension post-projet).

## Verification rapide

```bash
pnpm docker:up
pnpm dev:backend
pnpm dev:gateway

curl http://localhost:4000/health | jq
```

En cas de `degraded`, le tableau `services` indique quel microservice est en echec et pourquoi.

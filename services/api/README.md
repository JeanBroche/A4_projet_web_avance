# api — Gateway HTTP Moleculer

Service `api` (moleculer-web) du monorepo AERONEXIS. Expose `GET /health` et `GET /api/health` (issue [#5](https://github.com/JeanBroche/A4_projet_web_avance/issues/5)).

## Prerequis

- Redis demarre : `pnpm docker:up` (racine du monorepo)
- Variables dans `.env` (copie de `.env.example`)

## Demarrage

Depuis la racine :

```bash
pnpm dev:api
```

Depuis ce dossier :

```bash
pnpm dev
```

Le gateway ecoute sur le port `4000` (`GATEWAY_PORT`).

## Verification manuelle

```bash
# Health direct (gateway)
curl http://localhost:4000/health
curl http://localhost:4000/api/health

# Via proxy Nuxt (web + api demarres)
curl http://localhost:3000/api/health
```

Reponse attendue : `200` avec `{ "status": "ok", "version": "0.0.0" }`.

## Architecture

- `moleculer.config.js` — broker Redis (`REDIS_URL`), serializer JSON, logger JSON
- `services/api.service.js` — routes HTTP moleculer-web
- Config partagee : `@aeronexis/moleculer-config` (correlationId via header `x-correlation-id`)

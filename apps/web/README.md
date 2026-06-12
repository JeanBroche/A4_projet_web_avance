# web — Frontend AERONEXIS

Application Nuxt du monorepo AERONEXIS Dynamics.

## Démarrage (mode Gateway — défaut)

```bash
# Demarrer Docker Desktop, puis infra seule (dev hybride MS sur l'hote) :
pnpm docker:up
pnpm db:reset         # migrations + seed démo

# Terminal 1 — backend + gateway
pnpm dev:backend

# Terminal 2 — front (proxy /api → :4000)
pnpm dev:web
```

Scénario seed : [`docs/seed-scenario.md`](../../docs/seed-scenario.md).

Application : [http://localhost:3000](http://localhost:3000)

## Architecture

```
Pages → Composables → Adapters (moleculer | mock) → Gateway / fixtures
```

| Couche | Dossier | Rôle |
|--------|---------|------|
| Adapters moleculer | `app/lib/adapters/moleculer/` | HTTP vers gateway (chemin principal) |
| Adapters mock | `app/lib/adapters/mock/` | Offline / tests (`NUXT_PUBLIC_API_ADAPTER=mock`) |
| Mappers | `app/lib/mappers/` | DTO microservices → types UI |
| Fixtures | `app/fixtures/` | Données mock uniquement |

### Sélection de l'adapter

```bash
NUXT_PUBLIC_API_ADAPTER=moleculer   # défaut
NUXT_PUBLIC_API_ADAPTER=mock        # sans backend
```

Voir [`apps/web/.env.example`](.env.example).

## Scénario soutenance (15 min) — Gateway

| Étape | Compte | Page |
|-------|--------|------|
| 1 | `operateur@` | `/bom` → `/batch` : lot + anomalie + export traçabilité |
| 2 | `logistique@` | `/inventaire/spare` : alertes + réservation |
| 3 | `commercial@` | `/commands` : validation urgente + risque retard |
| 4 | `direction@` | `/dashboard` : KPI multi-site + incidents |

Points clés jury : adapter pattern, JWT + refresh, proxy `/api`, RBAC route + UI, mappers DTO côté front.

## Assistant IA — création d'OF

L'assistant Mistral (via Ollama local) pré-remplit le formulaire « Nouvel OF » sur `/bom` (rôles opérateur / admin).

```bash
ollama pull mistral
ollama serve   # écoute sur :11434
```

Variables optionnelles (`.env` racine) : `OLLAMA_BASE_URL`, `OLLAMA_MODEL`.

Route Nitro : `POST /api/ai/of` (`server/routes/api/ai/of.post.ts`, prioritaire sur le proxy gateway).

## Scripts

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build production |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Tests (mappers, etc.) |

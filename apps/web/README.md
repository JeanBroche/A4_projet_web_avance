# web — Frontend AERONEXIS

Application Nuxt du monorepo AERONEXIS Dynamics (issue [#6](https://github.com/JeanBroche/A4_projet_web_avance/issues/6)).

## Demarrage

Depuis la **racine** du monorepo :

```bash
pnpm dev:web
```

Depuis ce dossier (`apps/web`) — equivalent :

```bash
pnpm dev
# ou
pnpm dev:web
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

## Proxy API

En developpement, les requetes vers `/api/*` sont proxifiees vers la gateway Moleculer (`moleculer-web`, issue #5).

Le proxy cible `http://localhost:4000` (port par defaut de `moleculer-web`, configurable dans `nuxt.config.ts` quand la gateway #5 sera en place).

Verification manuelle (gateway demarree) :

```bash
curl http://localhost:3000/api/health
```

## Layouts

Layouts squelettes par espace metier dans `app/layouts/` :

- `default` — shell principal (header/footer)
- `auth` — pages d'authentification
- `production`, `logistique`, `commercial`, `direction` — espaces metier

Utilisation dans une page :

```ts
definePageMeta({ layout: 'production' })
```

## Session (stub)

Le composable `useSession()` (`app/composables/useSession.ts`) expose un utilisateur mock (`role: 'guest'`) en attendant l'auth (issue #11).

## Scripts

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de developpement |
| `pnpm build` | Build production |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Verification TypeScript |

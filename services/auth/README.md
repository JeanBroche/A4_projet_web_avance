# auth — Microservice Moleculer

Microservice d'authentification (issues [#5](https://github.com/JeanBroche/A4_projet_web_avance/issues/5), [#94](https://github.com/JeanBroche/A4_projet_web_avance/issues/94)). Fournit JWT (login, refresh, logout, me), CRUD utilisateurs et roles RBAC.

## Prerequis

- Redis demarre : `pnpm docker:up` (depuis la racine)
- Variables : `JWT_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `SEED_ADMIN_PASSWORD` (voir [`.env.example`](../../.env.example))

## Scripts Prisma (depuis `services/auth`)

| Commande | Description |
|----------|-------------|
| `pnpm db:migrate` | Appliquer les migrations (`schema auth`) |
| `pnpm db:migrate:dev` | Creer / appliquer une migration en dev |
| `pnpm db:seed` | Donnees de reference (admin, sites, roles) |
| `pnpm db:studio` | Prisma Studio — http://localhost:5555 (choisir le schema `auth`) |
| `pnpm db:generate` | Regenerer le client (automatique via `pnpm build`) |

Orchestration globale (racine) : `pnpm db:migrate`, `pnpm db:seed` sur les 5 MS.

## Prisma (M1)

| Schema PG | Modeles |
|-----------|---------|
| `auth` | Site, User, Role, UserRole, RefreshToken |

Import client :

```js
import { prisma } from "@aeronexis/auth/db";
```

Seed : admin `admin@aeronexis.local` / `SEED_ADMIN_PASSWORD` avec role `admin`.

Roles RBAC : `operateur`, `logistique`, `commercial`, `direction`, `admin`.

## Demarrage

Depuis la racine :

```bash
pnpm dev:auth
```

Depuis ce dossier :

```bash
pnpm dev
```

## Actions Moleculer

| Action | Description |
|--------|-------------|
| `auth.ping` | Smoke test |
| `auth.login` | Email + password → tokens |
| `auth.refresh` | Rotation du refresh token |
| `auth.logout` | Revocation du refresh token |
| `auth.me` | Profil courant via access token |
| `auth.user.list` | Liste utilisateurs (admin) |
| `auth.user.create` | Creation utilisateur (admin) |
| `auth.user.update` | Mise a jour utilisateur (admin) |
| `auth.role.list` | Liste des roles (admin) |

Erreurs structurees : `{ error: { code, message, details? } }`.

## Verification manuelle

Avec le broker auth demarre, Redis et PostgreSQL disponibles :

```bash
pnpm run call:ping
pnpm run smoke:auth
```

Exemples `moleculer call` :

```bash
pnpm exec moleculer call auth.login --email admin@aeronexis.local --password "<SEED_ADMIN_PASSWORD>" -c moleculer.config.ts
pnpm exec moleculer call auth.me --accessToken "<accessToken>" -c moleculer.config.ts
pnpm exec moleculer call auth.refresh --refreshToken "<refreshToken>" -c moleculer.config.ts
pnpm exec moleculer call auth.logout --refreshToken "<refreshToken>" -c moleculer.config.ts
pnpm exec moleculer call auth.role.list --accessToken "<accessToken>" -c moleculer.config.ts
```

## Tests

```bash
pnpm test
```

Tests d'integration (`node:test`) : login, refresh, logout, me, RBAC admin. Les tests DB-dependent sont ignores si PostgreSQL est indisponible.

## Template service metier

Le fichier [`service.schema.ts`](service.schema.ts) documente la convention de nommage des actions et la structure minimale d'un service TypeScript.

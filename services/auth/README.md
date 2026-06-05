# auth — Microservice Moleculer

Premier service metier Moleculer (issue [#5](https://github.com/JeanBroche/A4_projet_web_avance/issues/5)). Fournit l'action `auth.ping` pour smoke test et un template `service.schema.js` pour les futurs services.

## Prerequis

- Redis demarre : `pnpm docker:up`
- PostgreSQL + migrations : `pnpm db:migrate` (schema `auth`)

## Prisma (M1)

| Schema PG | Modeles |
|-----------|---------|
| `auth` | Site, User, Role, UserRole, RefreshToken |

Import client :

```js
import { prisma } from "@aeronexis/auth/db";
```

Seed : `pnpm db:seed` (apres migration). Admin : `admin@aeronexis.local` / `SEED_ADMIN_PASSWORD`.

## Demarrage

Depuis la racine :

```bash
pnpm dev:auth
```

Depuis ce dossier :

```bash
pnpm dev
```

## Verification manuelle

Avec le broker auth demarre et Redis disponible :

```bash
pnpm run call:ping
# ou
moleculer call auth.ping -c moleculer.config.js --id moleculer-cli
```

Reponse attendue : `"pong"`.

Pour inspecter la sante du noeud :

```bash
moleculer call '$node.health' -t redis://localhost:6379 --ns aeronexis
```

## Template service metier

Le fichier [`service.schema.js`](service.schema.js) documente la convention de nommage des actions et la structure minimale d'un service. Copier vers `services/<domaine>/services/<domaine>.service.js` pour ajouter un nouveau microservice.

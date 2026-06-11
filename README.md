# AERONEXIS Dynamics — ERP

Projet web avance (A4) : ERP modulaire pour composants mecaniques de haute precision.

## Demarrage rapide

### Prerequis

- Node.js 20+
- [pnpm](https://pnpm.io/) 11 (via Corepack : `corepack enable`)
- Docker Desktop (environnement local)

### Installation

```bash
git clone https://github.com/JeanBroche/A4_projet_web_avance.git
cd A4_projet_web_avance
corepack enable
pnpm install
```

Copier les variables d environnement :

```bash
cp .env.example .env
```

### Environnement Docker

```bash
pnpm docker:up       # infra : 5 PostgreSQL, MongoDB, Kafka, Redis, MinIO
pnpm docker:down     # arreter l infra
pnpm docker:apps:up  # infra + microservices containerises (voir .env.docker.example)
pnpm docker:apps:down
```

Ports et commandes de verification : [infra/docker/README.md](infra/docker/README.md).


| Service               | Connexion hote par defaut                          |
| --------------------- | -------------------------------------------------- |
| PostgreSQL auth       | `localhost:5432` → `aeronexis_auth`                |
| PostgreSQL stock      | `localhost:5433` → `aeronexis_stock`               |
| PostgreSQL order      | `localhost:5434` → `aeronexis_order`               |
| PostgreSQL production | `localhost:5435` → `aeronexis_production`          |
| PostgreSQL shipment   | `localhost:5436` → `aeronexis_shipment`            |
| MongoDB               | `mongodb://localhost:27017/aeronexis`              |
| Redis                 | `redis://localhost:6379`                           |
| Kafka                 | `localhost:9092`                                   |
| MinIO                 | `localhost:9000` (API), `localhost:9001` (console) |


Chaque microservice Prisma lit son URL via une variable dediee (`AUTH_DATABASE_URL`, `STOCK_DATABASE_URL`, etc. — voir `.env.example`). Chaque MS a son propre conteneur PostgreSQL et son `Dockerfile` sous `services/<nom>/`.

### Scripts racine


| Commande                | Description                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm dev`              | Lance les scripts `dev` de chaque workspace                                                          |
| `pnpm dev:gateway`      | Gateway HTTP `apps/gateway`                                                                          |
| `pnpm dev:auth`         | Microservice `auth`                                                                                  |
| `pnpm dev:stock`        | Microservice `stock`                                                                                 |
| `pnpm dev:order`        | Microservice `order`                                                                                 |
| `pnpm dev:production`   | Microservice `production`                                                                            |
| `pnpm dev:shipment`     | Microservice `shipment`                                                                              |
| `pnpm dev:reporting`    | Microservice `reporting` (KPI direction, milestone M7)                                               |
| `pnpm dev:backend`      | Lance les 6 MS metier (`auth`, `stock`, `order`, `production`, `shipment`, `reporting`) en parallele |
| `pnpm dev:web`          | Lance le frontend Nuxt sur le port 3000                                                              |
| `pnpm lint`             | Lint sur tous les workspaces                                                                         |
| `pnpm test`             | Tests sur tous les workspaces                                                                        |
| `pnpm build`            | Build sur tous les workspaces                                                                        |
| `pnpm docker:up`        | Demarre l infra Docker (`infra/docker`)                                                              |
| `pnpm docker:down`      | Arrete l infra Docker                                                                                |
| `pnpm docker:apps:up`   | Infra + 5 MS containerises (build inclus)                                                            |
| `pnpm docker:apps:down` | Arrete infra + MS                                                                                    |
| `pnpm db:migrate`       | Migrations des 5 MS (orchestration racine)                                                           |
| `pnpm db:migrate:dev`   | Migrations dev des 5 MS                                                                              |
| `pnpm db:seed`          | Seed des 5 MS                                                                                        |
| `pnpm db:studio:auth`   | Prisma Studio auth (raccourci ; voir aussi scripts locaux par MS)                                    |


Chaque microservice Prisma est autonome : depuis `services/<ms>/`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:studio` (ports 5555–5559). Voir `[packages/db/README.md](packages/db/README.md)`.

### Arborescence

```text
apps/
  web/              # Nuxt (issue #6)
  gateway/          # API Gateway (issue #5)
services/
  auth/             # Microservices Moleculer (issue #5)
  production/
  stock/
  order/
  shipment/
  reporting/
  audit/
packages/
  shared/           # Types et constantes partages
  db/               # Outillage Prisma (factory, migrate/seed)
  moleculer-config/ # Config broker Moleculer partagee
infra/
  docker/           # Docker Compose
docs/
```

Backlog : [Milestone M0 — Socle technique](https://github.com/JeanBroche/A4_projet_web_avance/milestone/1).

### Backend Moleculer (issue #5)

Demarrer l infra puis les services :

```bash
pnpm docker:up
pnpm backend
```

Gateway HTTP : `http://localhost:4000` (`GET /health`, `/api/*`).

Verification manuelle (Moleculer CLI) :

```bash
cd services/auth && pnpm run call:ping
cd ../stock && pnpm run call:ping
cd ../production && pnpm run call:ping
cd ../reporting && pnpm run call:ping
```

Details : `[apps/gateway/README.md](apps/gateway/README.md)`, `[services/auth/README.md](services/auth/README.md)`.

## Integration continue

[GitHub Actions](https://github.com/JeanBroche/A4_projet_web_avance/actions) et [Dependabot](.github/dependabot.yml) automatisent la qualite du depot.

### A chaque push / pull request


| Workflow           | Role                                                             |
| ------------------ | ---------------------------------------------------------------- |
| **CI**             | Lint Markdown ; lint, tests et build pnpm                        |
| **Security**       | Detection de secrets exposes (Gitleaks)                          |
| **Link check**     | Verification des liens dans les fichiers Markdown                |
| **Spell check**    | Orthographe des workflows (fichiers en anglais)                  |
| **Workflows lint** | Validation syntaxique des fichiers workflow (actionlint)         |
| **CodeQL**         | Analyse de securite du code JS/TS (des qu il y a du code source) |


### Sur les pull requests uniquement


| Workflow              | Role                                                              |
| --------------------- | ----------------------------------------------------------------- |
| **PR Labeler**        | Etiquettes automatiques selon les fichiers modifies               |
| **Dependency review** | Revue des dependances vulnerables (si fichier lock npm/yarn/pnpm) |


### Planifie / manuel


| Workflow       | Role                                                |
| -------------- | --------------------------------------------------- |
| **Stale**      | Ferme les issues/PR inactives (chaque lundi)        |
| **CodeQL**     | Analyse hebdomadaire complementaire                 |
| **Dependabot** | PR de mise a jour des actions GitHub (hebdomadaire) |


### Labels pour le labeler automatique

Creez sur GitHub les labels : `documentation`, `github`, `frontend`, `backend` (couleurs au choix) pour que **PR Labeler** fonctionne correctement.

### Protection de branche (recommande)

Dans **Settings → Branches**, sur `main` : exiger une PR et les checks **CI / Markdown lint**, **Security / Secret scan**, **Link check / Check Markdown links**.
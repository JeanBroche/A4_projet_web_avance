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
pnpm docker:up    # demarrer PostgreSQL, MongoDB, Kafka, Redis, MinIO
pnpm docker:down  # arreter les conteneurs
```

Ports et commandes de verification : [infra/docker/README.md](infra/docker/README.md).

| Service    | Connexion hote par defaut |
| ---------- | ------------------------- |
| PostgreSQL | `postgresql://aeronexis:aeronexis_dev@localhost:5432/aeronexis` |
| MongoDB    | `mongodb://localhost:27017/aeronexis` |
| Redis      | `redis://localhost:6379` |
| Kafka      | `localhost:9092` |
| MinIO      | `localhost:9000` (API), `localhost:9001` (console) — voir `MINIO_*` dans `.env.example` |

### Scripts racine

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Lance les scripts `dev` de chaque workspace |
| `pnpm dev:api` | Gateway Moleculer HTTP (`GET /health`, port 4000) |
| `pnpm dev:auth` | Microservice `auth` (action `auth.ping`) |
| `pnpm dev:stock` | Microservice `stock` (issue [#96](https://github.com/JeanBroche/A4_projet_web_avance/issues/96)) |
| `pnpm dev:backend` | Lance `api` + `auth` + `stock` en parallele |
| `pnpm dev:web` | Lance le frontend Nuxt sur le port 3000 |
| `pnpm lint` | Lint sur tous les workspaces |
| `pnpm test` | Tests sur tous les workspaces |
| `pnpm build` | Build sur tous les workspaces |
| `pnpm docker:up` | Demarre Docker Compose (`infra/docker`) |
| `pnpm docker:down` | Arrete Docker Compose |
| `pnpm db:migrate` | Applique les migrations Prisma (5 MS) |
| `pnpm db:migrate:dev` | Migrations Prisma en dev |
| `pnpm db:seed` | Seed de reference (auth, stock, commande, production, expedition) |
| `pnpm db:studio:auth` | Prisma Studio — schema `auth` (idem `:stock`, `:commande`, `:production`, `:expedition`) |

### Arborescence

```text
apps/
  web/              # Nuxt (issue #6)
  gateway/          # API Gateway (issue #5)
services/
  api/              # Gateway HTTP Moleculer (issue #5)
  auth/             # Microservices Moleculer (issue #5)
  production/
  stock/
  commande/
  expedition/
  reporting/
  notification/
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
pnpm dev:backend
```

Verification manuelle :

```bash
curl.exe http://localhost:4000/health
curl.exe http://localhost:4000/api/health
cd services/auth && pnpm run call:ping
```

Details : [`services/api/README.md`](services/api/README.md), [`services/auth/README.md`](services/auth/README.md).

## Integration continue

[GitHub Actions](https://github.com/JeanBroche/A4_projet_web_avance/actions) et [Dependabot](.github/dependabot.yml) automatisent la qualite du depot.

### A chaque push / pull request

| Workflow | Role |
|----------|------|
| **CI** | Lint Markdown ; lint, tests et build pnpm |
| **Security** | Detection de secrets exposes (Gitleaks) |
| **Link check** | Verification des liens dans les fichiers Markdown |
| **Spell check** | Orthographe des workflows (fichiers en anglais) |
| **Workflows lint** | Validation syntaxique des fichiers workflow (actionlint) |
| **CodeQL** | Analyse de securite du code JS/TS (des qu il y a du code source) |

### Sur les pull requests uniquement

| Workflow | Role |
|----------|------|
| **PR Labeler** | Etiquettes automatiques selon les fichiers modifies |
| **Dependency review** | Revue des dependances vulnerables (si fichier lock npm/yarn/pnpm) |

### Planifie / manuel

| Workflow | Role |
|----------|------|
| **Stale** | Ferme les issues/PR inactives (chaque lundi) |
| **CodeQL** | Analyse hebdomadaire complementaire |
| **Dependabot** | PR de mise a jour des actions GitHub (hebdomadaire) |

### Labels pour le labeler automatique

Creez sur GitHub les labels : `documentation`, `github`, `frontend`, `backend` (couleurs au choix) pour que **PR Labeler** fonctionne correctement.

### Protection de branche (recommande)

Dans **Settings → Branches**, sur `main` : exiger une PR et les checks **CI / Markdown lint**, **Security / Secret scan**, **Link check / Check Markdown links**.

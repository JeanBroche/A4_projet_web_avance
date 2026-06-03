# AERONEXIS Dynamics — ERP

Projet web avance (A4) : ERP modulaire pour composants mecaniques de haute precision.

## Demarrage rapide

### Prerequis

- Node.js 20+
- [pnpm](https://pnpm.io/) 9 (via Corepack : `corepack enable`)
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
| `pnpm dev` | Lance les scripts `dev` de chaque workspace (placeholders) |
| `pnpm lint` | Lint sur tous les workspaces |
| `pnpm test` | Tests sur tous les workspaces |
| `pnpm build` | Build sur tous les workspaces |
| `pnpm docker:up` | Demarre Docker Compose (`infra/docker`) |
| `pnpm docker:down` | Arrete Docker Compose |

### Arborescence

```text
apps/
  web/              # Nuxt (issue #6)
  gateway/          # API Gateway (issue #5)
services/
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
infra/
  docker/           # Docker Compose
docs/
```

Backlog : [Milestone M0 — Socle technique](https://github.com/JeanBroche/A4_projet_web_avance/milestone/1).

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

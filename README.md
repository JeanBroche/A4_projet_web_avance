<div align="center">
  <h1>CESI A4 - Projet Web Avancé</h1>
  <h3>AERONEXIS Dynamics - Precision Beyond Limits</h3>
  <h3>Développement d'un ERP modulaire pour composants mécaniques aéronautiques</h3>
  <p><strong>Antoine TAFOUREAU</strong> • <strong>Killian HUBAULT</strong> • <strong>Hugo HELM</strong></p>
  <p><em>CESI A4 - Module Développement Web </em></p>
</div>

## Contexte du projet

AERONEXIS Dynamics est un ERP de gestion logistique développé lors du module de développement web avancé (CESI A4). Il est conçu pour gérer les ordres de production, le stock, les commandes et les expéditions de composants mécaniques aéronautiques, tout en intégrant un assistant IA pour automatiser certaines tâches.
> [!WARNING]
> Cette ERP a été développé dans le cadre de la finalisation d'un module de formation, lors d'une période de développement intensive de 1 semaine. Merci de prendre ceci en compte vis-à-vis de la qualité du code et de la présence de certaines fonctionnalités incomplètes ou non optimisées.

## Contexte métier

Créée il y a 18 ans par deux ingénieurs passionnés d’aéronautique, l’entreprise s’est forgé une réputation solide dans la fabrication de composants mécaniques de haute précision pour l’aviation civile et les drones longue portée.

Chaque pièce produite peut équiper un moteur, un système hydraulique ou un module embarqué critique.

L'entreprise a connu une croissance rapide, de 40%. La signature de nouveaux contrats internationaux a mis en lumière les limites du fonctionnement interne actuel :
- Les plannings sont encore recalculés sous Excel.
- Les responsables production échangent par e-mail pour réaffecter des priorités.
- Les matières premières sont parfois réservées deux fois.
- Les délais clients sont annoncés sans vision consolidée.
- Lorsqu’un défaut est détecté, retracer l’historique complet d’un lot prend plusieurs heures.

**Mission :** Développer un ERP industriel permettant une structuration des flux de production, une traçabilité complète, une gestion multi-sites et multi-utilisateurs, et une automatisation des tâches répétitives via un assistant IA.

## Technologies utilisées
Liste des technologies utilisées dans le projet (non imposée) :
- Nuxt.js
- Moleculer.js
- PostgreSQL
- Prisma
- MongoDB
- Redis
- Kafka
- Docker

### Architecture technique

```mermaid
architecture-beta
group backend(server)["Backend + kafka message queue"]
    group gateway(internet)["API Gateway container"] in backend
      service moleculerGateway(internet)[Moleculer gateway] in gateway

    group services1(internet)["Microservices containers"] in backend
        service auth(server)[Auth] in services1
        service production(server)[Production] in services1
        service stock(server)[Stock] in services1
        service order(server)[Order] in services1
        service shipment(server)[Shipment] in services1
        service reporting(server)[Reporting] in services1
        service audit(server)[Audit] in services1
        service notification(server)[Notification] in services1

    group databases(internet)["Databases containers"] in backend
        service postgresStock(database)[PostgreSQL stock] in databases
        service postgresOrder(database)[PostgreSQL order] in databases
        service postgresProduction(database)[PostgreSQL production] in databases
        service postgresShipment(database)[PostgreSQL shipment] in databases
        service postgresAuth(database)[PostgreSQL auth] in databases
        service mongoAudit(database)[MongoDB audit] in databases
        service redisSessions(database)[Redis sessions] in databases
    
    group aiAgent(internet)["AI Agent container - ollama self-hosted"] in backend
        service aiAgentServ(server)[Mistral model] in aiAgent
    
    group frontend(internet)["Frontend"]
        group web(internet)["Nuxt.js container"] in frontend
            service nuxtWeb(internet)["Nuxt.js & NuxtUI"] in web

    junction inter in backend
    
    auth:L -- R:inter
    order:L -- R:inter
    production:L -- R:inter
    shipment:L -- R:inter
    stock:L -- R:inter
    reporting:L -- R:inter
    audit:L -- R:inter
    notification:L -- R:inter

    moleculerGateway:R -- L:inter

    stock:R -- L:postgresStock
    order:R -- L:postgresOrder
    production:R -- L:postgresProduction
    shipment:R -- L:postgresShipment
    auth:R -- L:postgresAuth
    auth:R -- L:redisSessions
    audit:R -- L:mongoAudit
    notification:R -- L:redisSessions
    reporting:R -- L:redisSessions

    nuxtWeb:R -- L:moleculerGateway

    inter:R -- L:aiAgentServ
    aiAgentServ:R -- L:postgresProduction

    align column auth notification reporting order production shipment stock  audit aiAgentServ
    align column postgresAuth redisSessions postgresOrder   postgresProduction postgresShipment postgresStock mongoAudit 

    align row nuxtWeb moleculerGateway inter 
```

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

Copier les variables d'environnement :

```bash
cp .env.example .env
```

### Environnement Docker

```bash
pnpm docker:up    # démarrer PostgreSQL, MongoDB, Kafka, Redis, MinIO
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
| `pnpm dev:backend` | Lance `api` + `auth` en parallele |
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

Démarrer l'infra puis les services :

```bash
pnpm docker:up
pnpm dev:backend
```

Vérification manuelle :

```bash
curl.exe http://localhost:4000/health
curl.exe http://localhost:4000/api/health
cd services/auth && pnpm run call:ping
```

Détails : [`services/api/README.md`](services/api/README.md), [`services/auth/README.md`](services/auth/README.md).

## Integration continue

[GitHub Actions](https://github.com/JeanBroche/A4_projet_web_avance/actions) et [Dependabot](.github/dependabot.yml) automatisent la qualité du depot.

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

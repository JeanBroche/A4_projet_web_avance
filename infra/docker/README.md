# Docker Compose

Environnement local reproductible : 5 PostgreSQL (1 par microservice Prisma), MongoDB, Kafka (KRaft), Redis, MinIO, et optionnellement les microservices Moleculer containerises. Issue [#4](https://github.com/JeanBroche/A4_projet_web_avance/issues/4).

## Demarrage

### Infra seule (dev hybride — MS sur l'hote)

Depuis la racine du depot :

```bash
cp .env.example .env   # si pas deja fait
pnpm docker:up
pnpm db:migrate        # tous les MS (ou cd services/<ms> && pnpm db:migrate)
# pnpm docker:down     # arreter les conteneurs (volumes conserves)
```

### Infra + microservices containerises

```bash
cp .env.example .env
cp .env.docker.example .env.docker
pnpm docker:apps:up
pnpm docker:apps:down
```

Fichiers compose : [`docker-compose.yml`](docker-compose.yml) (infra), [`docker-compose.apps.yml`](docker-compose.apps.yml) (MS + migrations).

## Services et ports

| Service | Image | Port(s) hote | Usage |
| ------- | ----- | ------------ | ----- |
| postgres-auth | postgres:16-alpine | 5432 | Base `aeronexis_auth` |
| postgres-stock | postgres:16-alpine | 5433 | Base `aeronexis_stock` |
| postgres-order | postgres:16-alpine | 5434 | Base `aeronexis_order` |
| postgres-production | postgres:16-alpine | 5435 | Base `aeronexis_production` |
| postgres-shipment | postgres:16-alpine | 5436 | Base `aeronexis_shipment` |
| mongo | mongo:7 | 27017 | Logs / audit |
| redis | redis:7-alpine | 6379 | Cache / transporter Moleculer |
| kafka | apache/kafka:3.8.1 | 9092 | Bus d evenements (KRaft) |
| minio | minio/minio | 9000, 9001 | Stockage S3 (API + console) |

Avec `docker:apps:up`, conteneurs supplementaires : `db-migrate` (one-shot), `auth`, `stock`, `order`, `production`, `shipment`.

Volumes nommes : `pg_auth_data`, `pg_stock_data`, `pg_order_data`, `pg_production_data`, `pg_shipment_data`, `mongo_data`, `mongo_init_modules`, `redis_data`, `kafka_data`, `minio_data`.

Chaque conteneur PostgreSQL cree sa base via `POSTGRES_DB` au premier demarrage (volume vide).

Conteneurs d initialisation one-shot :

- `minio-init` cree le bucket `aeronexis-docs`.
- `mongo-init` execute `infra/mongo/init.ts` (issue [#9](https://github.com/JeanBroche/A4_projet_web_avance/issues/9)).
- `db-migrate` applique les migrations Prisma sur les 5 bases (avec `docker:apps:up`).

## Verification manuelle

### PostgreSQL

```bash
docker exec -it aeronexis-postgres-auth psql -U aeronexis -d aeronexis_auth -c "SELECT 1;"
docker exec -it aeronexis-postgres-stock psql -U aeronexis -d aeronexis_stock -c "SELECT 1;"
# idem : postgres-order, postgres-production, postgres-shipment
```

### Microservices (stack apps)

```bash
docker exec -it aeronexis-auth pnpm call:ping
```

### MongoDB

```bash
docker exec -it aeronexis-mongo mongosh --eval "db.adminCommand('ping')"
docker exec -it aeronexis-mongo mongosh aeronexis --eval "db.getCollectionNames()"
```

Collections attendues apres `pnpm docker:up` : `audit_logs`, `event_history`.

Re-init manuelle Mongo :

```bash
pnpm mongo:init
```

### Kafka

```bash
docker exec -it aeronexis-kafka /opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

### Redis

```bash
docker exec -it aeronexis-redis redis-cli ping
```

### MinIO

- API : port `9000` sur `localhost`
- Console : port `9001` (identifiants `minioadmin` / `minioadmin` par defaut)

## Migration depuis l ancien conteneur unique

Si vous aviez le volume `docker_pg_data` :

```powershell
pnpm docker:down
docker volume rm docker_pg_data
pnpm docker:up
pnpm db:migrate
```

## Variables d environnement

- Dev hybride (MS sur l hote) : [`.env.example`](../../.env.example) — ports PG `5432` a `5436` sur `localhost`.
- MS containerises : [`.env.docker.example`](../../.env.docker.example) copie vers `.env.docker` — hostnames Compose (`postgres-auth`, `redis`, etc.).

# Docker Compose

Environnement local reproductible : PostgreSQL, MongoDB, Kafka (KRaft), Redis, MinIO. Issue [#4](https://github.com/JeanBroche/A4_projet_web_avance/issues/4).

## Demarrage

Depuis la racine du depot :

```bash
cp .env.example .env   # si pas deja fait
pnpm docker:up
pnpm docker:down     # arreter et supprimer les conteneurs (volumes conserves)
```

Fichier compose : [`docker-compose.yml`](docker-compose.yml).

## Services et ports

| Service    | Image              | Port(s) hote | Usage                          |
| ---------- | ------------------ | ------------ | ------------------------------ |
| postgres   | postgres:16-alpine | 5432         | Donnees relationnelles ERP     |
| mongo      | mongo:7            | 27017        | Logs / audit                   |
| redis      | redis:7-alpine     | 6379         | Cache / sessions               |
| kafka      | apache/kafka:3.8.1 | 9092         | Bus d evenements (KRaft)       |
| minio      | minio/minio        | 9000, 9001   | Stockage S3 (API + console)    |

Volumes nommes : `pg_data`, `mongo_data`, `mongo_init_modules`, `redis_data`, `kafka_data`, `minio_data`.

Initialisation au premier demarrage :

- `postgres` execute [`infra/postgres/init.sql`](../postgres/init.sql) qui cree 5 bases dediees (`aeronexis_auth`, `aeronexis_stock`, `aeronexis_commande`, `aeronexis_production`, `aeronexis_expedition`). La base admin `aeronexis` reste disponible pour `psql -l`, `pg_dump`, etc.

Conteneurs d initialisation one-shot (executes apres healthcheck) :

- `minio-init` cree le bucket `aeronexis-docs`.
- `mongo-init` execute `infra/mongo/init.ts` (driver `mongodb` + `tsx`) pour creer les collections `audit_logs`, `event_history` et leurs index (issue [#9](https://github.com/JeanBroche/A4_projet_web_avance/issues/9)). Script idempotent : rejouable via `pnpm mongo:init` depuis l hote sans supprimer le volume `mongo_data`.

## Verification manuelle

### PostgreSQL

```bash
docker exec -it aeronexis-postgres psql -U aeronexis -d aeronexis -c "SELECT 1;"
docker exec -it aeronexis-postgres psql -U aeronexis -l
# Attendu : aeronexis, aeronexis_auth, aeronexis_stock, aeronexis_commande, aeronexis_production, aeronexis_expedition
```

Re-init des bases (devs ayant deja le volume `pg_data`) : le script `init.sql` ne s execute qu au PREMIER demarrage. Pour le rejouer, soit :

```powershell
pnpm docker:down
docker volume rm docker_pg_data    # ATTENTION : perte des donnees PG
pnpm docker:up
```

Soit manuellement sans destruction :

```powershell
docker exec -i aeronexis-postgres psql -U aeronexis -d aeronexis -f /docker-entrypoint-initdb.d/init.sql
```

### MongoDB

```bash
docker exec -it aeronexis-mongo mongosh --eval "db.adminCommand('ping')"
docker exec -it aeronexis-mongo mongosh aeronexis --eval "db.getCollectionNames()"
docker exec -it aeronexis-mongo mongosh aeronexis --eval "db.audit_logs.getIndexes()"
```

Collections attendues apres `pnpm docker:up` : `audit_logs`, `event_history`.

Re-init manuelle (sans recreer le volume Mongo) :

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

- API : port `9000` sur `localhost` (voir `MINIO_ENDPOINT` dans `.env.example`)
- Console : port `9001` sur `localhost` (identifiants `minioadmin` / `minioadmin` par defaut)

## Variables d environnement

Les identifiants et ports par defaut sont definis dans [`.env.example`](../../.env.example) a la racine. Docker Compose les lit depuis un fichier `.env` a la racine du projet.

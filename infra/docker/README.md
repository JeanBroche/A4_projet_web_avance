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

Volumes nommes : `pg_data`, `mongo_data`, `redis_data`, `kafka_data`, `minio_data`.

Le conteneur `minio-init` cree le bucket `aeronexis-docs` au premier demarrage.

## Verification manuelle

### PostgreSQL

```bash
docker exec -it aeronexis-postgres psql -U aeronexis -d aeronexis -c "SELECT 1;"
```

### MongoDB

```bash
docker exec -it aeronexis-mongo mongosh --eval "db.adminCommand('ping')"
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

- API : http://localhost:9000
- Console : http://localhost:9001 (identifiants `minioadmin` / `minioadmin` par defaut)

## Variables d environnement

Les identifiants et ports par defaut sont definis dans [`.env.example`](../../.env.example) a la racine. Docker Compose les lit depuis un fichier `.env` a la racine du projet.

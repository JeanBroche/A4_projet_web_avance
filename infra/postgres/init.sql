-- AERONEXIS - initialisation PostgreSQL : 1 base dediee par microservice Prisma.
-- Execute automatiquement par l entrypoint postgres:16-alpine (via /docker-entrypoint-initdb.d/)
-- au PREMIER demarrage du conteneur (volume pg_data vide).
--
-- Pour rejouer manuellement apres modification :
--   docker exec -i aeronexis-postgres psql -U aeronexis -d aeronexis < infra/postgres/init.sql

CREATE DATABASE aeronexis_auth;
CREATE DATABASE aeronexis_stock;
CREATE DATABASE aeronexis_commande;
CREATE DATABASE aeronexis_production;
CREATE DATABASE aeronexis_expedition;

ALTER TABLE "commande"."clients" ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "commande"."clients_code_key";

CREATE INDEX "clients_deletedAt_idx" ON "commande"."clients"("deletedAt");
CREATE INDEX "clients_code_idx" ON "commande"."clients"("code");
CREATE UNIQUE INDEX "clients_code_active_key" ON "commande"."clients"("code") WHERE "deletedAt" IS NULL;

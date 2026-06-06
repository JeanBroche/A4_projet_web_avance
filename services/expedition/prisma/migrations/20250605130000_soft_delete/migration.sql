ALTER TABLE "expedition"."deliveries" ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "expedition"."deliveries_code_key";

CREATE INDEX "deliveries_deletedAt_idx" ON "expedition"."deliveries"("deletedAt");
CREATE INDEX "deliveries_code_idx" ON "expedition"."deliveries"("code");
CREATE UNIQUE INDEX "deliveries_code_active_key" ON "expedition"."deliveries"("code") WHERE "deletedAt" IS NULL;

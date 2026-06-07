ALTER TABLE "stock"."materials" ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "stock"."materials_siteCode_code_key";

CREATE INDEX "materials_deletedAt_idx" ON "stock"."materials"("deletedAt");
CREATE INDEX "materials_siteCode_code_idx" ON "stock"."materials"("siteCode", "code");
CREATE UNIQUE INDEX "materials_siteCode_code_active_key" ON "stock"."materials"("siteCode", "code") WHERE "deletedAt" IS NULL;

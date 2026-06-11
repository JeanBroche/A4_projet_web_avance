-- Add site scoping to BOMs
ALTER TABLE "production"."BOMProduct" ADD COLUMN IF NOT EXISTS "siteCode" TEXT;

UPDATE "production"."BOMProduct"
SET "siteCode" = 'SITE-LYO'
WHERE "siteCode" IS NULL;

ALTER TABLE "production"."BOMProduct" ALTER COLUMN "siteCode" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "BOMProduct_siteCode_idx" ON "production"."BOMProduct"("siteCode");
CREATE INDEX IF NOT EXISTS "BOMProduct_siteCode_bom_code_idx" ON "production"."BOMProduct"("siteCode", "bom_code");

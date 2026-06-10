ALTER TABLE "production"."BatchProduct" ADD COLUMN "siteCode" TEXT;

UPDATE "production"."BatchProduct" SET "siteCode" = 'SITE-LYO' WHERE "siteCode" IS NULL;

ALTER TABLE "production"."BatchProduct" ALTER COLUMN "siteCode" SET NOT NULL;

CREATE INDEX "BatchProduct_siteCode_idx" ON "production"."BatchProduct"("siteCode");

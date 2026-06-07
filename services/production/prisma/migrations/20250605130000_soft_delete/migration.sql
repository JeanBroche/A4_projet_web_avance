ALTER TABLE "production"."product_stocks" ADD COLUMN "deletedAt" TIMESTAMP(3);

DROP INDEX "production"."product_stocks_siteCode_productCode_key";

CREATE INDEX "product_stocks_deletedAt_idx" ON "production"."product_stocks"("deletedAt");
CREATE INDEX "product_stocks_siteCode_productCode_idx" ON "production"."product_stocks"("siteCode", "productCode");
CREATE UNIQUE INDEX "product_stocks_siteCode_productCode_active_key" ON "production"."product_stocks"("siteCode", "productCode") WHERE "deletedAt" IS NULL;

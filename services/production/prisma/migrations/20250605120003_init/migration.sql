-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "production";

-- CreateTable
CREATE TABLE "production"."product_stocks" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "siteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_stocks_siteCode_idx" ON "production"."product_stocks"("siteCode");

-- CreateIndex
CREATE UNIQUE INDEX "product_stocks_siteCode_productCode_key" ON "production"."product_stocks"("siteCode", "productCode");

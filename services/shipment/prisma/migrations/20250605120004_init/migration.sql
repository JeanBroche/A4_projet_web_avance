-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "expedition";

-- CreateTable
CREATE TABLE "expedition"."deliveries" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expectedDeliveryDate" DATE,
    "shippedAt" TIMESTAMP(3),
    "siteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_code_key" ON "expedition"."deliveries"("code");

-- CreateIndex
CREATE INDEX "deliveries_siteCode_idx" ON "expedition"."deliveries"("siteCode");

-- CreateIndex
CREATE INDEX "deliveries_orderNumber_idx" ON "expedition"."deliveries"("orderNumber");

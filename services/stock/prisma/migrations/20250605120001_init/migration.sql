-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "stock";

-- CreateTable
CREATE TABLE "stock"."materials" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "lastReplenishment" DATE,
    "siteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "materials_siteCode_idx" ON "stock"."materials"("siteCode");

-- CreateIndex
CREATE UNIQUE INDEX "materials_siteCode_code_key" ON "stock"."materials"("siteCode", "code");

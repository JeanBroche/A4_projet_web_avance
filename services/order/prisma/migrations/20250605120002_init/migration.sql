-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "commande";

-- CreateTable
CREATE TABLE "commande"."clients" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "type" TEXT,
    "annualRevenue" INTEGER,
    "firstContractDate" DATE,
    "status" TEXT NOT NULL DEFAULT 'active',
    "siteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_code_key" ON "commande"."clients"("code");

-- CreateIndex
CREATE INDEX "clients_siteCode_idx" ON "commande"."clients"("siteCode");

-- M4: tables transactionnelles stock (mouvements, reservations, alertes, retards fournisseur)

-- CreateTable
CREATE TABLE "stock"."stock_movements" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "documentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."stock_reservations" (
    "id" TEXT NOT NULL,
    "ofId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."stock_alerts" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock"."supplier_delays" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "expectedDate" DATE NOT NULL,
    "actualDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_delays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_movements_materialId_idx" ON "stock"."stock_movements"("materialId");
CREATE INDEX "stock_movements_siteCode_idx" ON "stock"."stock_movements"("siteCode");
CREATE INDEX "stock_movements_type_idx" ON "stock"."stock_movements"("type");
CREATE INDEX "stock_movements_createdAt_idx" ON "stock"."stock_movements"("createdAt");

CREATE INDEX "stock_reservations_ofId_idx" ON "stock"."stock_reservations"("ofId");
CREATE INDEX "stock_reservations_materialId_idx" ON "stock"."stock_reservations"("materialId");
CREATE INDEX "stock_reservations_siteCode_idx" ON "stock"."stock_reservations"("siteCode");
CREATE INDEX "stock_reservations_status_idx" ON "stock"."stock_reservations"("status");

CREATE INDEX "stock_alerts_materialId_idx" ON "stock"."stock_alerts"("materialId");
CREATE INDEX "stock_alerts_siteCode_idx" ON "stock"."stock_alerts"("siteCode");
CREATE INDEX "stock_alerts_resolvedAt_idx" ON "stock"."stock_alerts"("resolvedAt");

CREATE INDEX "supplier_delays_materialId_idx" ON "stock"."supplier_delays"("materialId");
CREATE INDEX "supplier_delays_supplier_idx" ON "stock"."supplier_delays"("supplier");
CREATE INDEX "supplier_delays_expectedDate_idx" ON "stock"."supplier_delays"("expectedDate");

-- AddForeignKey
ALTER TABLE "stock"."stock_movements" ADD CONSTRAINT "stock_movements_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "stock"."materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock"."stock_reservations" ADD CONSTRAINT "stock_reservations_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "stock"."materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock"."stock_alerts" ADD CONSTRAINT "stock_alerts_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "stock"."materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock"."supplier_delays" ADD CONSTRAINT "supplier_delays_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "stock"."materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

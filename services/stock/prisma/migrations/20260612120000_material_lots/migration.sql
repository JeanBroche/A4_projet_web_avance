-- M5: Traçabilité lot matière (aéronautique) — lots, DLC, certificats, emplacements

CREATE TABLE "stock"."material_lots" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "supplierLot" TEXT,
    "supplier" TEXT,
    "certificateRef" TEXT,
    "certificateUrl" TEXT,
    "manufacturedAt" DATE,
    "expiryAt" DATE,
    "receivedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
    "quantity" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_lots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "material_lots_materialId_lotNumber_key" ON "stock"."material_lots"("materialId", "lotNumber");
CREATE INDEX "material_lots_siteCode_idx" ON "stock"."material_lots"("siteCode");
CREATE INDEX "material_lots_status_idx" ON "stock"."material_lots"("status");
CREATE INDEX "material_lots_expiryAt_idx" ON "stock"."material_lots"("expiryAt");

ALTER TABLE "stock"."material_lots"
    ADD CONSTRAINT "material_lots_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "stock"."materials"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

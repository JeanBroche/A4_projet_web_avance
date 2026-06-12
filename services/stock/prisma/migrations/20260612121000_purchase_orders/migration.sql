-- M6: Commandes d'achat (réapprovisionnement matières)

CREATE TABLE "stock"."purchase_orders" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "expectedDate" DATE,
    "receivedDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_orders_poNumber_key" ON "stock"."purchase_orders"("poNumber");
CREATE INDEX "purchase_orders_materialId_idx" ON "stock"."purchase_orders"("materialId");
CREATE INDEX "purchase_orders_siteCode_idx" ON "stock"."purchase_orders"("siteCode");
CREATE INDEX "purchase_orders_status_idx" ON "stock"."purchase_orders"("status");
CREATE INDEX "purchase_orders_supplier_idx" ON "stock"."purchase_orders"("supplier");

ALTER TABLE "stock"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "stock"."materials"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

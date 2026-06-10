-- Drop legacy Delivery model
DROP TABLE IF EXISTS "expedition"."deliveries";

-- CreateTable
CREATE TABLE "expedition"."pick_lists" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "ofId" TEXT,
    "clientCode" TEXT,
    "siteCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedition"."pick_list_lines" (
    "id" TEXT NOT NULL,
    "pickListId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "productCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pickedQty" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pick_list_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedition"."shipments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "pickListId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "clientCode" TEXT,
    "siteCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "carrier" TEXT,
    "plannedShipDate" DATE,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expedition"."shipment_tracking_events" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pick_lists_siteCode_idx" ON "expedition"."pick_lists"("siteCode");
CREATE INDEX "pick_lists_orderNumber_idx" ON "expedition"."pick_lists"("orderNumber");
CREATE INDEX "pick_lists_deletedAt_idx" ON "expedition"."pick_lists"("deletedAt");
CREATE INDEX "pick_lists_code_idx" ON "expedition"."pick_lists"("code");
CREATE UNIQUE INDEX "pick_lists_code_active_key" ON "expedition"."pick_lists"("code") WHERE "deletedAt" IS NULL;

CREATE INDEX "pick_list_lines_pickListId_idx" ON "expedition"."pick_list_lines"("pickListId");
CREATE INDEX "pick_list_lines_productCode_idx" ON "expedition"."pick_list_lines"("productCode");

CREATE UNIQUE INDEX "shipments_pickListId_key" ON "expedition"."shipments"("pickListId");
CREATE INDEX "shipments_siteCode_idx" ON "expedition"."shipments"("siteCode");
CREATE INDEX "shipments_orderNumber_idx" ON "expedition"."shipments"("orderNumber");
CREATE INDEX "shipments_clientCode_idx" ON "expedition"."shipments"("clientCode");
CREATE INDEX "shipments_status_idx" ON "expedition"."shipments"("status");
CREATE INDEX "shipments_deletedAt_idx" ON "expedition"."shipments"("deletedAt");
CREATE INDEX "shipments_code_idx" ON "expedition"."shipments"("code");
CREATE UNIQUE INDEX "shipments_code_active_key" ON "expedition"."shipments"("code") WHERE "deletedAt" IS NULL;

CREATE INDEX "shipment_tracking_events_shipmentId_idx" ON "expedition"."shipment_tracking_events"("shipmentId");
CREATE INDEX "shipment_tracking_events_createdAt_idx" ON "expedition"."shipment_tracking_events"("createdAt");

-- AddForeignKey
ALTER TABLE "expedition"."pick_list_lines" ADD CONSTRAINT "pick_list_lines_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "expedition"."pick_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "expedition"."shipments" ADD CONSTRAINT "shipments_pickListId_fkey" FOREIGN KEY ("pickListId") REFERENCES "expedition"."pick_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expedition"."shipment_tracking_events" ADD CONSTRAINT "shipment_tracking_events_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "expedition"."shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "commande"."customer_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "promisedDeliveryDate" TIMESTAMP(3),
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande"."customer_order_lines" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineNumber" INT NOT NULL,
    "productCode" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER,
    "ofId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande"."order_status_history" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande"."order_validations" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "validatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_orders_clientId_idx" ON "commande"."customer_orders"("clientId");
CREATE INDEX "customer_orders_siteCode_idx" ON "commande"."customer_orders"("siteCode");
CREATE INDEX "customer_orders_status_idx" ON "commande"."customer_orders"("status");
CREATE INDEX "customer_orders_isUrgent_idx" ON "commande"."customer_orders"("isUrgent");
CREATE INDEX "customer_orders_deletedAt_idx" ON "commande"."customer_orders"("deletedAt");
CREATE INDEX "customer_orders_orderNumber_idx" ON "commande"."customer_orders"("orderNumber");
CREATE UNIQUE INDEX "customer_orders_orderNumber_active_key" ON "commande"."customer_orders"("orderNumber") WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "customer_order_lines_orderId_idx" ON "commande"."customer_order_lines"("orderId");
CREATE INDEX "customer_order_lines_productCode_idx" ON "commande"."customer_order_lines"("productCode");
CREATE INDEX "customer_order_lines_deletedAt_idx" ON "commande"."customer_order_lines"("deletedAt");

-- CreateIndex
CREATE INDEX "order_status_history_orderId_idx" ON "commande"."order_status_history"("orderId");
CREATE INDEX "order_status_history_createdAt_idx" ON "commande"."order_status_history"("createdAt");

-- CreateIndex
CREATE INDEX "order_validations_orderId_idx" ON "commande"."order_validations"("orderId");

-- AddForeignKey
ALTER TABLE "commande"."customer_orders" ADD CONSTRAINT "customer_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "commande"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande"."customer_order_lines" ADD CONSTRAINT "customer_order_lines_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "commande"."customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande"."order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "commande"."customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande"."order_validations" ADD CONSTRAINT "order_validations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "commande"."customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "production"."BOMProduct" (
    "id" TEXT NOT NULL,
    "bom_code" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BOMProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production"."BatchProduct" (
    "batch_id" TEXT NOT NULL,
    "batch_code" TEXT NOT NULL,
    "bom_id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "plannedStartAt" TIMESTAMP(3),
    "plannedEndAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchProduct_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "production"."ProductionStep" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "step_code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "order_index" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production"."BatchActionHistory" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchActionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production"."Anomalies" (
    "anomaly_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "anomaly_code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anomalies_pkey" PRIMARY KEY ("anomaly_id")
);

-- CreateTable
CREATE TABLE "production"."Anomalies_Batch" (
    "anomaly_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,

    CONSTRAINT "Anomalies_Batch_pkey" PRIMARY KEY ("batch_id","anomaly_id")
);

-- CreateIndex
CREATE INDEX "BOMProduct_bom_code_idx" ON "production"."BOMProduct"("bom_code");
CREATE INDEX "BOMProduct_deletedAt_idx" ON "production"."BOMProduct"("deletedAt");
CREATE INDEX "BatchProduct_batch_code_idx" ON "production"."BatchProduct"("batch_code");
CREATE INDEX "BatchProduct_bom_id_idx" ON "production"."BatchProduct"("bom_id");
CREATE INDEX "BatchProduct_status_idx" ON "production"."BatchProduct"("status");
CREATE INDEX "BatchProduct_deletedAt_idx" ON "production"."BatchProduct"("deletedAt");
CREATE INDEX "ProductionStep_batch_id_idx" ON "production"."ProductionStep"("batch_id");
CREATE INDEX "BatchActionHistory_batch_id_idx" ON "production"."BatchActionHistory"("batch_id");
CREATE INDEX "BatchActionHistory_createdAt_idx" ON "production"."BatchActionHistory"("createdAt");
CREATE INDEX "Anomalies_batch_id_idx" ON "production"."Anomalies"("batch_id");
CREATE INDEX "Anomalies_anomaly_code_idx" ON "production"."Anomalies"("anomaly_code");
CREATE INDEX "Anomalies_Batch_batch_id_idx" ON "production"."Anomalies_Batch"("batch_id");
CREATE INDEX "Anomalies_Batch_anomaly_id_idx" ON "production"."Anomalies_Batch"("anomaly_id");

-- AddForeignKey
ALTER TABLE "production"."BatchProduct" ADD CONSTRAINT "BatchProduct_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "production"."BOMProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production"."ProductionStep" ADD CONSTRAINT "ProductionStep_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "production"."BatchProduct"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production"."BatchActionHistory" ADD CONSTRAINT "BatchActionHistory_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "production"."BatchProduct"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production"."Anomalies_Batch" ADD CONSTRAINT "Anomalies_Batch_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "production"."BatchProduct"("batch_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production"."Anomalies_Batch" ADD CONSTRAINT "Anomalies_Batch_anomaly_id_fkey" FOREIGN KEY ("anomaly_id") REFERENCES "production"."Anomalies"("anomaly_id") ON DELETE RESTRICT ON UPDATE CASCADE;

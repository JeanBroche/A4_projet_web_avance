-- AlterTable
ALTER TABLE "production"."BOMProduct" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal';

UPDATE "production"."BOMProduct" SET "priority" = 'high' WHERE "bom_code" = 'BOM-SEED-003';
UPDATE "production"."BOMProduct" SET "priority" = 'critical' WHERE "bom_code" = 'BOM-SEED-004';

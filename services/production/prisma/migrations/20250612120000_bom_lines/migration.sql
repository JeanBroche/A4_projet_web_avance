CREATE TABLE IF NOT EXISTS "production"."BOMLine" (
    "id" TEXT NOT NULL,
    "bom_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BOMLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BOMLine_bom_id_idx" ON "production"."BOMLine"("bom_id");

ALTER TABLE "production"."BOMLine"
    DROP CONSTRAINT IF EXISTS "BOMLine_bom_id_fkey";

ALTER TABLE "production"."BOMLine"
    ADD CONSTRAINT "BOMLine_bom_id_fkey"
    FOREIGN KEY ("bom_id") REFERENCES "production"."BOMProduct"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "production"."BOMLine" ("id", "bom_id", "material_id", "quantity", "createdAt", "updatedAt")
SELECT
    'bomline_' || "id",
    "id",
    "material_id",
    "quantity",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "production"."BOMProduct"
WHERE "deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "production"."BOMLine" bl WHERE bl."bom_id" = "BOMProduct"."id"
  );

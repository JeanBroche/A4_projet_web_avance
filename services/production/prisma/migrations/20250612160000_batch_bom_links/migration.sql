CREATE TABLE "production"."BatchBomLink" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "bom_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchBomLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BatchBomLink_batch_id_bom_id_key" ON "production"."BatchBomLink"("batch_id", "bom_id");
CREATE INDEX "BatchBomLink_batch_id_idx" ON "production"."BatchBomLink"("batch_id");
CREATE INDEX "BatchBomLink_bom_id_idx" ON "production"."BatchBomLink"("bom_id");

ALTER TABLE "production"."BatchBomLink" ADD CONSTRAINT "BatchBomLink_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "production"."BatchProduct"("batch_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production"."BatchBomLink" ADD CONSTRAINT "BatchBomLink_bom_id_fkey" FOREIGN KEY ("bom_id") REFERENCES "production"."BOMProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "production"."BatchBomLink" ("id", "batch_id", "bom_id", "createdAt")
SELECT
    b."batch_id" || ':' || b."bom_id",
    b."batch_id",
    b."bom_id",
    b."createdAt"
FROM "production"."BatchProduct" b
WHERE b."deletedAt" IS NULL;

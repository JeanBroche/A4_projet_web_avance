-- BOMLine.quantity devient un coefficient par unité de produit (Float).
ALTER TABLE "production"."BOMLine" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::double precision;

-- Convertir les totaux existants en coefficients par unité.
UPDATE "production"."BOMLine" bl
SET "quantity" = bl."quantity" / NULLIF(bp."quantity", 0)
FROM "production"."BOMProduct" bp
WHERE bl."bom_id" = bp."id" AND bp."quantity" > 0;

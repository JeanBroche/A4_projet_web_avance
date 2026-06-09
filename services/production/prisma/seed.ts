import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { createPrismaClient } from "@aeronexis/db";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  PROD_STATUSES,
  createDefaultSteps,
  recordBatchHistory
} from "../src/lib/prod-helper.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const prisma = createPrismaClient(PrismaClient, process.env.PRODUCTION_DATABASE_URL);

async function upsertProduct() {
  const existing = await prisma.productStock.findFirst({
    where: {
      siteCode: "SITE-LYO",
      productCode: "PROD-001",
      deletedAt: null
    }
  });

  if (existing) {
    return prisma.productStock.update({
      where: { id: existing.id },
      data: {
        description: "Palier haute precision PN-100",
        quantity: 10,
        reservedQuantity: 2
      }
    });
  }

  return prisma.productStock.create({
    data: {
      productCode: "PROD-001",
      description: "Palier haute precision PN-100",
      quantity: 10,
      reservedQuantity: 2,
      siteCode: "SITE-LYO"
    }
  });
}

async function upsertDemoBomAndBatch() {
  let bom = await prisma.bOMProduct.findFirst({
    where: { bom_code: "BOM-SEED-001", deletedAt: null }
  });

  if (!bom) {
    bom = await prisma.bOMProduct.create({
      data: {
        bom_code: "BOM-SEED-001",
        material_id: "MAT-001",
        description: "Nomenclature palier PN-100",
        quantity: 1,
        status: PROD_STATUSES.PENDING
      }
    });
  }

  let batch = await prisma.batchProduct.findFirst({
    where: { batch_code: "BATCH-SEED-001", deletedAt: null }
  });

  if (!batch) {
    const plannedStart = new Date("2026-06-10T08:00:00.000Z");
    const plannedEnd = new Date("2026-06-12T17:00:00.000Z");

    batch = await prisma.batchProduct.create({
      data: {
        batch_code: "BATCH-SEED-001",
        bom_id: bom.id,
        command_id: "CMD-2025-00001",
        status: PROD_STATUSES.IN_PROGRESS,
        progress: 25,
        plannedStartAt: plannedStart,
        plannedEndAt: plannedEnd
      }
    });

    await createDefaultSteps(prisma, batch.batch_id);
    await recordBatchHistory(
      prisma,
      batch.batch_id,
      "batch.created",
      "Lot seed initialise",
      "seed"
    );
    await recordBatchHistory(
      prisma,
      batch.batch_id,
      "batch.progress",
      "Avancement 25%",
      "seed"
    );
  }

  return { bom, batch };
}

async function main() {
  const product = await upsertProduct();
  const { bom, batch } = await upsertDemoBomAndBatch();

  console.log("Production seed completed:", {
    productCode: product.productCode,
    siteCode: product.siteCode,
    bom_code: bom.bom_code,
    batch_code: batch.batch_code
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

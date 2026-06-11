import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  PROD_STATUSES,
  createDefaultSteps,
  recordBatchHistory,
  replaceBomLines
} from "../src/lib/production-helpers.js";
import { prisma } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

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
        status: PROD_STATUSES.PENDING,
        siteCode: "SITE-LYO"
      }
    });
    await replaceBomLines(prisma, bom.id, [
      { material_id: "MAT-001", quantity: 1 },
      { material_id: "MAT-002", quantity: 2 }
    ]);
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
        siteCode: "SITE-LYO",
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
  } else {
    batch = await prisma.batchProduct.update({
      where: { batch_id: batch.batch_id },
      data: { siteCode: "SITE-LYO" }
    });
  }

  return { bom, batch };
}

async function upsertParisProduct() {
  const existing = await prisma.productStock.findFirst({
    where: {
      siteCode: "SITE-PAR",
      productCode: "PROD-PAR-001",
      deletedAt: null
    }
  });

  if (existing) {
    return existing;
  }

  return prisma.productStock.create({
    data: {
      productCode: "PROD-PAR-001",
      description: "Composant site Paris",
      quantity: 5,
      siteCode: "SITE-PAR"
    }
  });
}

async function upsertParisBatch(bomId: string) {
  const existing = await prisma.batchProduct.findFirst({
    where: { batch_code: "BATCH-SEED-PAR-001", deletedAt: null }
  });

  if (existing) {
    return existing;
  }

  const batch = await prisma.batchProduct.create({
    data: {
      batch_code: "BATCH-SEED-PAR-001",
      bom_id: bomId,
      command_id: "CMD-PAR-00001",
      siteCode: "SITE-PAR",
      status: PROD_STATUSES.PENDING
    }
  });

  await createDefaultSteps(prisma, batch.batch_id);
  return batch;
}

async function main() {
  const product = await upsertProduct();
  const parisProduct = await upsertParisProduct();
  const { bom, batch } = await upsertDemoBomAndBatch();
  const parisBatch = await upsertParisBatch(bom.id);

  console.log("Production seed completed:", {
    productCode: product.productCode,
    siteCode: product.siteCode,
    parisProductCode: parisProduct.productCode,
    bom_code: bom.bom_code,
    batch_code: batch.batch_code,
    parisBatchCode: parisBatch.batch_code
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

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  SEED_ANOMALY,
  SEED_BATCHES,
  SEED_BOM,
  SEED_MATERIALS,
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_SITES,
  SEED_USER_IDS
} from "@aeronexis/shared";
import {
  PROD_STATUSES,
  STEP_STATUSES,
  VALIDATION_ANOMALIES,
  createDefaultSteps,
  recordBatchHistory,
  replaceBomLines
} from "../src/lib/production-helpers.js";
import { prisma } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

async function upsertProduct(
  productCode: string,
  description: string,
  siteCode: string,
  quantity: number,
  reservedQuantity = 0
) {
  const existing = await prisma.productStock.findFirst({
    where: { siteCode, productCode, deletedAt: null }
  });

  if (existing) {
    return prisma.productStock.update({
      where: { id: existing.id },
      data: { description, quantity, reservedQuantity }
    });
  }

  return prisma.productStock.create({
    data: { productCode, description, quantity, reservedQuantity, siteCode }
  });
}

async function upsertBom(
  bomCode: string,
  materialId: string,
  description: string,
  siteCode: string,
  status: string,
  lines: Array<{ material_id: string; quantity: number }>
) {
  let bom = await prisma.bOMProduct.findFirst({
    where: { bom_code: bomCode, deletedAt: null }
  });

  if (!bom) {
    bom = await prisma.bOMProduct.create({
      data: {
        bom_code: bomCode,
        material_id: materialId,
        description,
        quantity: 1,
        status,
        siteCode
      }
    });
  } else {
    bom = await prisma.bOMProduct.update({
      where: { id: bom.id },
      data: { status, description, siteCode }
    });
  }

  await replaceBomLines(prisma, bom.id, lines);
  return bom;
}

async function upsertBatch(
  batchCode: string,
  bomId: string,
  commandId: string,
  siteCode: string,
  status: string,
  progress: number,
  options?: { plannedStartAt?: Date; plannedEndAt?: Date }
) {
  let batch = await prisma.batchProduct.findFirst({
    where: { batch_code: batchCode, deletedAt: null }
  });

  if (!batch) {
    batch = await prisma.batchProduct.create({
      data: {
        batch_code: batchCode,
        bom_id: bomId,
        command_id: commandId,
        siteCode,
        status,
        progress,
        plannedStartAt: options?.plannedStartAt,
        plannedEndAt: options?.plannedEndAt
      }
    });
    await createDefaultSteps(prisma, batch.batch_id);
    await recordBatchHistory(prisma, batch.batch_id, "batch.created", "Lot seed initialise", "seed");
    if (progress > 0) {
      await recordBatchHistory(
        prisma,
        batch.batch_id,
        "batch.progress",
        `Avancement ${progress}%`,
        "seed"
      );
    }
  } else {
    batch = await prisma.batchProduct.update({
      where: { batch_id: batch.batch_id },
      data: {
        bom_id: bomId,
        command_id: commandId,
        siteCode,
        status,
        progress,
        plannedStartAt: options?.plannedStartAt,
        plannedEndAt: options?.plannedEndAt
      }
    });
  }

  return batch;
}

async function upsertOpenAnomaly(batchId: string) {
  const existing = await prisma.anomalies.findFirst({
    where: { anomaly_code: SEED_ANOMALY.CODE, batch_id: batchId }
  });

  const anomaly = existing
    ? await prisma.anomalies.update({
        where: { anomaly_id: existing.anomaly_id },
        data: {
          description: "Ecart dimensionnel detecte en controle qualite",
          status: VALIDATION_ANOMALIES.OPEN
        }
      })
    : await prisma.anomalies.create({
        data: {
          anomaly_id: SEED_ANOMALY.ID,
          batch_id: batchId,
          anomaly_code: SEED_ANOMALY.CODE,
          description: "Ecart dimensionnel detecte en controle qualite",
          status: VALIDATION_ANOMALIES.OPEN
        }
      });

  await prisma.anomalies_Batch.upsert({
    where: {
      batch_id_anomaly_id: { batch_id: batchId, anomaly_id: anomaly.anomaly_id }
    },
    update: {},
    create: { batch_id: batchId, anomaly_id: anomaly.anomaly_id }
  });

  const historyExists = await prisma.batchActionHistory.findFirst({
    where: { batch_id: batchId, action: "batch.anomaly_reported" }
  });
  if (!historyExists) {
    await recordBatchHistory(
      prisma,
      batchId,
      "batch.anomaly_reported",
      SEED_ANOMALY.CODE,
      SEED_USER_IDS.operateur
    );
  }
}

async function completeBatchSteps(batchId: string) {
  await prisma.productionStep.updateMany({
    where: { batch_id: batchId },
    data: { status: STEP_STATUSES.COMPLETED }
  });
}

async function main() {
  const product = await upsertProduct(
    SEED_PRODUCTS.PALIER,
    "Palier haute precision PN-100",
    SEED_SITES.LYO,
    10,
    2
  );
  await upsertProduct(
    SEED_PRODUCTS.PLAQUE,
    "Plaque aluminium aeronautique",
    SEED_SITES.LYO,
    15,
    0
  );
  const parisProduct = await upsertProduct(
    SEED_PRODUCTS.PARIS,
    "Composant site Paris",
    SEED_SITES.PAR,
    5,
    0
  );

  const bomPalier = await upsertBom(
    SEED_BOM.PALIER,
    SEED_MATERIALS.ACIER,
    "Nomenclature palier PN-100",
    SEED_SITES.LYO,
    PROD_STATUSES.IN_PROGRESS,
    [
      { material_id: SEED_MATERIALS.ACIER, quantity: 1 },
      { material_id: SEED_MATERIALS.TITANE, quantity: 2 }
    ]
  );

  const bomPlaque = await upsertBom(
    SEED_BOM.PLAQUE,
    SEED_MATERIALS.ACIER,
    "Nomenclature plaque aluminium",
    SEED_SITES.LYO,
    PROD_STATUSES.PENDING,
    [{ material_id: SEED_MATERIALS.ACIER, quantity: 3 }]
  );

  const plannedStart = new Date("2026-06-10T08:00:00.000Z");
  const plannedEnd = new Date("2026-06-12T17:00:00.000Z");

  const batchInProgress = await upsertBatch(
    SEED_BATCHES.LYO_IN_PROGRESS,
    bomPalier.id,
    SEED_ORDERS.CMD04,
    SEED_SITES.LYO,
    PROD_STATUSES.IN_PROGRESS,
    25,
    { plannedStartAt: plannedStart, plannedEndAt: plannedEnd }
  );
  await upsertOpenAnomaly(batchInProgress.batch_id);

  const completedStart = new Date("2026-01-05T08:00:00.000Z");
  const completedEnd = new Date("2026-01-10T17:00:00.000Z");
  const batchCompleted = await upsertBatch(
    SEED_BATCHES.LYO_COMPLETED,
    bomPalier.id,
    SEED_ORDERS.CMD05,
    SEED_SITES.LYO,
    PROD_STATUSES.COMPLETED,
    100,
    { plannedStartAt: completedStart, plannedEndAt: completedEnd }
  );
  await completeBatchSteps(batchCompleted.batch_id);

  const historyCompleted = await prisma.batchActionHistory.findFirst({
    where: { batch_id: batchCompleted.batch_id, action: "batch.progress" }
  });
  if (!historyCompleted) {
    await recordBatchHistory(
      prisma,
      batchCompleted.batch_id,
      "batch.progress",
      "Avancement 100%",
      "seed"
    );
  }

  const parisBatch = await upsertBatch(
    SEED_BATCHES.PAR_PENDING,
    bomPalier.id,
    SEED_ORDERS.CMD_PAR,
    SEED_SITES.PAR,
    PROD_STATUSES.PENDING,
    0
  );

  console.log("Production seed completed:", {
    productCode: product.productCode,
    parisProductCode: parisProduct.productCode,
    boms: [bomPalier.bom_code, bomPlaque.bom_code],
    batches: [batchInProgress.batch_code, batchCompleted.batch_code, parisBatch.batch_code]
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

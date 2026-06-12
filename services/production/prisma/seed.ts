import { config } from "dotenv";

import { dirname, resolve } from "path";

import { fileURLToPath } from "url";

import {

  SEED_ANOMALY,

  SEED_BATCH_SPECS,

  SEED_BOM_CATALOG,

  SEED_PRODUCT_NAMES,

  SEED_PRODUCTS,

  SEED_SITES,

  SEED_USER_IDS

} from "@aeronexis/shared";

import {

  PROD_STATUSES,

  VALIDATION_ANOMALIES,

  createDefaultSteps,

  recordBatchHistory,

  replaceBomLines,

  syncBatchProgressFromSteps

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

  quantity: number,

  lines: Array<{ material_id: string; quantity: number }>,

  priority = "normal"

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

        quantity,

        status,

        priority,

        siteCode

      }

    });

  } else {

    bom = await prisma.bOMProduct.update({

      where: { id: bom.id },

      data: { status, description, siteCode, quantity, material_id: materialId, priority }

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

        status: PROD_STATUSES.PENDING,

        progress: 0,

        plannedStartAt: options?.plannedStartAt,

        plannedEndAt: options?.plannedEndAt

      }

    });

    await createDefaultSteps(prisma, batch.batch_id);

    await recordBatchHistory(prisma, batch.batch_id, "batch.created", "Lot seed initialise", "seed");

  } else {

    batch = await prisma.batchProduct.update({

      where: { batch_id: batch.batch_id },

      data: {

        bom_id: bomId,

        command_id: commandId,

        siteCode,

        plannedStartAt: options?.plannedStartAt,

        plannedEndAt: options?.plannedEndAt

      }

    });

  }



  return batch;

}



async function setBatchStepStates(

  batchId: string,

  states: Record<string, string>

) {

  for (const [step_code, status] of Object.entries(states)) {

    await prisma.productionStep.updateMany({

      where: { batch_id: batchId, step_code },

      data: { status }

    });

  }



  const batch = await syncBatchProgressFromSteps(prisma, batchId);

  const historyExists = await prisma.batchActionHistory.findFirst({

    where: { batch_id: batchId, action: "batch.progress" }

  });

  if (batch.progress > 0 && !historyExists) {

    await recordBatchHistory(

      prisma,

      batchId,

      "batch.progress",

      `Avancement ${batch.progress}%`,

      "seed"

    );

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



async function main() {

  const bomByKey = new Map<string, { id: string; bom_code: string }>();



  for (const entry of SEED_BOM_CATALOG) {

    await upsertProduct(

      entry.productCode,

      SEED_PRODUCT_NAMES[entry.productCode as keyof typeof SEED_PRODUCT_NAMES],

      entry.siteCode,

      entry.quantity + 4,

      entry.key === "PALIER" ? 2 : 0

    );



    const bom = await upsertBom(

      entry.bomCode,

      entry.primaryMaterialId,

      entry.name,

      entry.siteCode,

      entry.status,

      entry.quantity,

      [...entry.lines],

      entry.priority

    );

    bomByKey.set(entry.key, bom);

  }



  await upsertProduct(

    SEED_PRODUCTS.PARIS,

    SEED_PRODUCT_NAMES[SEED_PRODUCTS.PARIS],

    SEED_SITES.PAR,

    5,

    0

  );



  const seededBatches: Array<{ code: string; progress: number; bomKey: string }> = [];



  for (const spec of SEED_BATCH_SPECS) {

    const bom = bomByKey.get(spec.bomKey);

    if (!bom) {

      throw new Error(`Missing BOM for batch spec: ${spec.bomKey}`);

    }



    const batch = await upsertBatch(spec.code, bom.id, spec.commandId, spec.siteCode, {

      plannedStartAt: spec.plannedStartAt ? new Date(spec.plannedStartAt) : undefined,

      plannedEndAt: spec.plannedEndAt ? new Date(spec.plannedEndAt) : undefined

    });



    const synced =

      Object.keys(spec.steps).length > 0

        ? await setBatchStepStates(batch.batch_id, spec.steps)

        : batch;



    if (spec.anomaly) {

      await upsertOpenAnomaly(synced.batch_id);

    }



    seededBatches.push({

      code: synced.batch_code,

      progress: synced.progress,

      bomKey: spec.bomKey

    });

  }



  console.log("Production seed completed:", {

    boms: SEED_BOM_CATALOG.map((entry) => ({

      code: entry.bomCode,

      status: entry.status,

      priority: entry.priority,

      materialScenario: entry.materialScenario,

      lines: entry.lines.length

    })),

    batches: seededBatches

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



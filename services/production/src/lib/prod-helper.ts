import { prisma } from "../db.js";
import { createError, generateCode } from "@aeronexis/services-shared";

export const PROD_STATUSES = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
} as const;

export const STEP_STATUSES = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED"
} as const;

export const VALIDATION_ANOMALIES = {
  OPEN: "OPEN",
  CLOSED: "CLOSED"
} as const;

export const DEFAULT_BATCH_STEPS = [
  { step_code: "STEP-01", label: "Preparation", order_index: 1 },
  { step_code: "STEP-02", label: "Fabrication", order_index: 2 },
  { step_code: "STEP-03", label: "Controle qualite", order_index: 3 }
] as const;

type DbClient = Pick<
  typeof prisma,
  | "productStock"
  | "bOMProduct"
  | "batchProduct"
  | "anomalies_Batch"
  | "anomalies"
  | "productionStep"
  | "batchActionHistory"
>;

async function generateUniqueCodeAsync(
  db: DbClient,
  prefix: string,
  exists: (code: string) => Promise<boolean>
): Promise<string> {
  let code: string;
  do {
    code = generateCode(prefix);
  } while (await exists(code));
  return code;
}

export async function generateBatchCode(db: DbClient) {
  const suffix = await generateUniqueCodeAsync(db, "BATCH", async (code) => {
    const row = await db.batchProduct.findFirst({ where: { batch_code: code } });
    return row !== null;
  });
  return `BATCH-${suffix}`;
}

export async function generateBOMCode(db: DbClient) {
  const suffix = await generateUniqueCodeAsync(db, "BOM", async (code) => {
    const row = await db.bOMProduct.findFirst({ where: { bom_code: code } });
    return row !== null;
  });
  return `BOM-${suffix}`;
}

export async function generateAnomalyCode(db: DbClient, batch_id: string) {
  const suffix = await generateUniqueCodeAsync(db, "ANOMALY", async (code) => {
    const row = await db.anomalies.findFirst({ where: { anomaly_code: code, batch_id } });
    return row !== null;
  });
  return `ANOMALY-${suffix}`;
}

export async function loadBatchByCode(db: DbClient, batch_code: string) {
  const batch = await db.batchProduct.findFirst({
    where: { batch_code, deletedAt: null }
  });

  if (!batch) {
    throw createError("NOT_FOUND", "Batch not found");
  }

  return batch;
}

export async function loadBatchById(db: DbClient, batch_id: string) {
  const batch = await db.batchProduct.findFirst({
    where: { batch_id, deletedAt: null }
  });

  if (!batch) {
    throw createError("NOT_FOUND", "Batch not found");
  }

  return batch;
}

export async function loadBomByCode(db: DbClient, bom_code: string) {
  const bom = await db.bOMProduct.findFirst({
    where: { bom_code, deletedAt: null }
  });

  if (!bom) {
    throw createError("NOT_FOUND", "BOM not found");
  }

  return bom;
}

export async function loadActiveProduct(db: DbClient, product_code: string) {
  const product = await db.productStock.findFirst({
    where: { productCode: product_code, deletedAt: null }
  });

  if (!product) {
    throw createError("NOT_FOUND", "Product not found");
  }

  return product;
}

export function assertStatusTransition(currStatus: string, nextStatus: string) {
  if (currStatus === nextStatus) {
    return;
  }

  const allowed: Record<string, string[]> = {
    [PROD_STATUSES.PENDING]: [PROD_STATUSES.IN_PROGRESS, PROD_STATUSES.CANCELLED],
    [PROD_STATUSES.IN_PROGRESS]: [PROD_STATUSES.COMPLETED, PROD_STATUSES.CANCELLED],
    [PROD_STATUSES.COMPLETED]: [],
    [PROD_STATUSES.CANCELLED]: []
  };

  if (!allowed[currStatus]?.includes(nextStatus)) {
    throw createError(
      "INVALID_STATUS_TRANSITION",
      `Invalid status transition from ${currStatus} to ${nextStatus}`
    );
  }
}

export function resolveStatusFromProgress(progress: number, currentStatus: string) {
  if (progress >= 100) {
    return PROD_STATUSES.COMPLETED;
  }
  if (progress > 0 && currentStatus === PROD_STATUSES.PENDING) {
    return PROD_STATUSES.IN_PROGRESS;
  }
  return currentStatus;
}

export async function recordBatchHistory(
  db: DbClient,
  batch_id: string,
  action: string,
  details?: string,
  performedBy?: string
) {
  return db.batchActionHistory.create({
    data: {
      batch_id,
      action,
      details,
      performedBy
    }
  });
}

export async function createDefaultSteps(db: DbClient, batch_id: string) {
  for (const step of DEFAULT_BATCH_STEPS) {
    await db.productionStep.create({
      data: {
        batch_id,
        step_code: step.step_code,
        label: step.label,
        order_index: step.order_index,
        status: STEP_STATUSES.PENDING
      }
    });
  }
}

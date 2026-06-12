import { withDistributedLock } from "@aeronexis/redis-infra";
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
  | "bOMLine"
  | "batchProduct"
  | "batchBomLink"
  | "anomalies_Batch"
  | "anomalies"
  | "productionStep"
  | "batchActionHistory"
>;

export type BomLineInput = { material_id: string; quantity: number };

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
  return withDistributedLock({ key: "lock:code:batch" }, async () => {
    const suffix = await generateUniqueCodeAsync(db, "BATCH", async (code) => {
      const row = await db.batchProduct.findFirst({ where: { batch_code: code } });
      return row !== null;
    });
    return `BATCH-${suffix}`;
  });
}

export async function generateBOMCode(db: DbClient) {
  return withDistributedLock({ key: "lock:code:bom" }, async () => {
    const suffix = await generateUniqueCodeAsync(db, "BOM", async (code) => {
      const row = await db.bOMProduct.findFirst({ where: { bom_code: code } });
      return row !== null;
    });
    return `BOM-${suffix}`;
  });
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

export async function assertSingleBatchPerBom(
  db: DbClient,
  bom_id: string,
  excludeBatchId?: string
) {
  const existing = await db.batchBomLink.findFirst({
    where: {
      bom_id,
      ...(excludeBatchId ? { batch_id: { not: excludeBatchId } } : {}),
      batch: { deletedAt: null }
    },
    include: { batch: { select: { batch_code: true } } }
  });

  if (existing) {
    throw createError(
      "CONFLICT",
      `Un lot est déjà assigné à cet OF (${existing.batch.batch_code})`
    );
  }
}

export async function linkBatchToBom(db: DbClient, batch_id: string, bom_id: string) {
  await db.batchBomLink.upsert({
    where: { batch_id_bom_id: { batch_id, bom_id } },
    create: { batch_id, bom_id },
    update: {}
  });
}

export function collectBatchBomCodes(batch: {
  bom: { bom_code: string };
  bomLinks: Array<{ bom: { bom_code: string } }>;
}) {
  return [...new Set([batch.bom.bom_code, ...batch.bomLinks.map((link) => link.bom.bom_code)])];
}

export const BATCH_BOM_INCLUDE = {
  bom: {
    select: {
      id: true,
      bom_code: true,
      description: true,
      quantity: true,
      priority: true
    }
  },
  bomLinks: {
    include: {
      bom: { select: { bom_code: true } }
    }
  }
} as const;

type BatchWithBomRelations = {
  bom: {
    id: string;
    bom_code: string;
    description: string | null;
    quantity: number;
    priority: string;
  };
  bomLinks: Array<{ bom: { bom_code: string } }>;
};

function buildBatchBomPayload(batch: BatchWithBomRelations) {
  const bom_codes = collectBatchBomCodes(batch);
  const { bom, bomLinks, ...rest } = batch;
  return {
    ...rest,
    bom_code: bom.bom_code,
    bom_codes,
    bom: {
      bom_code: bom.bom_code,
      description: bom.description,
      quantity: bom.quantity,
      priority: bom.priority
    }
  };
}

export function serializeBatchResponse(
  batch: BatchWithBomRelations & Record<string, unknown>
) {
  return buildBatchBomPayload(batch);
}

export function serializeBatchResponses(
  batches: Array<BatchWithBomRelations & Record<string, unknown>>
) {
  return batches.map((batch) => buildBatchBomPayload(batch));
}

export async function loadBomLines(db: DbClient, bom_id: string): Promise<BomLineInput[]> {
  const lines = await db.bOMLine.findMany({
    where: { bom_id },
    orderBy: { createdAt: "asc" }
  });

  if (lines.length > 0) {
    return lines.map((line) => ({
      material_id: line.material_id,
      quantity: line.quantity
    }));
  }

  const bom = await db.bOMProduct.findFirst({ where: { id: bom_id, deletedAt: null } });
  if (!bom) {
    return [];
  }

  return [{ material_id: bom.material_id, quantity: bom.quantity }];
}

export async function replaceBomLines(db: DbClient, bom_id: string, lines: BomLineInput[]) {
  await db.bOMLine.deleteMany({ where: { bom_id } });
  for (const line of lines) {
    await db.bOMLine.create({
      data: {
        bom_id,
        material_id: line.material_id,
        quantity: line.quantity
      }
    });
  }
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
      "PRODUCTION_INVALID_STATUS_TRANSITION",
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

export function computeProgressFromSteps(steps: Array<{ status: string }>): number {
  if (steps.length === 0) {
    return 0;
  }

  let weighted = 0;
  for (const step of steps) {
    if (step.status === STEP_STATUSES.COMPLETED) {
      weighted += 1;
    } else if (step.status === STEP_STATUSES.IN_PROGRESS) {
      weighted += 0.5;
    }
  }

  return Math.round((weighted / steps.length) * 100);
}

export function resolveStatusFromSteps(steps: Array<{ status: string }>): string {
  const progress = computeProgressFromSteps(steps);
  if (progress >= 100) {
    return PROD_STATUSES.COMPLETED;
  }
  if (
    steps.some(
      (step) =>
        step.status === STEP_STATUSES.IN_PROGRESS || step.status === STEP_STATUSES.COMPLETED
    )
  ) {
    return PROD_STATUSES.IN_PROGRESS;
  }
  return PROD_STATUSES.PENDING;
}

export async function syncBatchProgressFromSteps(db: DbClient, batch_id: string) {
  const steps = await db.productionStep.findMany({
    where: { batch_id },
    orderBy: { order_index: "asc" }
  });
  const progress = computeProgressFromSteps(steps);

  return db.batchProduct.update({
    where: { batch_id },
    data: { progress }
  });
}

export function resolveBatchStatusFromBoms(bomStatuses: string[]): string {
  if (bomStatuses.length === 0) {
    return PROD_STATUSES.PENDING;
  }

  const normalized = bomStatuses.map((status) => {
    if (status === PROD_STATUSES.CANCELLED) {
      return PROD_STATUSES.PENDING;
    }
    return status;
  });

  if (normalized.every((status) => status === PROD_STATUSES.COMPLETED)) {
    return PROD_STATUSES.COMPLETED;
  }
  if (normalized.some((status) => status === PROD_STATUSES.IN_PROGRESS)) {
    return PROD_STATUSES.IN_PROGRESS;
  }
  if (
    normalized.some((status) => status === PROD_STATUSES.COMPLETED) &&
    normalized.some((status) => status === PROD_STATUSES.PENDING)
  ) {
    return PROD_STATUSES.IN_PROGRESS;
  }
  return PROD_STATUSES.PENDING;
}

async function loadLinkedBomStatuses(db: DbClient, batch_id: string) {
  const batch = await db.batchProduct.findFirst({
    where: { batch_id, deletedAt: null },
    include: {
      bom: { select: { status: true } },
      bomLinks: { include: { bom: { select: { status: true } } } }
    }
  });
  if (!batch) {
    throw createError("NOT_FOUND", "Batch not found");
  }

  const statuses = [
    batch.bom.status,
    ...batch.bomLinks.map((link) => link.bom.status)
  ];
  return { batch, statuses: [...new Set(statuses)] };
}

export async function syncBatchStatusFromLinkedBoms(
  db: DbClient,
  batch_id: string,
  performedBy?: string
) {
  const { batch, statuses } = await loadLinkedBomStatuses(db, batch_id);
  const nextStatus = resolveBatchStatusFromBoms(statuses);
  if (nextStatus === batch.status) {
    return batch;
  }

  const updated = await db.batchProduct.update({
    where: { batch_id },
    data: { status: nextStatus }
  });
  await recordBatchHistory(
    db,
    batch_id,
    "batch.status_changed",
    `${batch.status} -> ${nextStatus} (OF)`,
    performedBy
  );
  return updated;
}

export async function findBatchIdsForBom(db: DbClient, bom_id: string) {
  const [primary, linked] = await Promise.all([
    db.batchProduct.findMany({
      where: { bom_id, deletedAt: null },
      select: { batch_id: true }
    }),
    db.batchBomLink.findMany({
      where: { bom_id, batch: { deletedAt: null } },
      select: { batch_id: true }
    })
  ]);
  return [...new Set([...primary.map((row) => row.batch_id), ...linked.map((row) => row.batch_id)])];
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

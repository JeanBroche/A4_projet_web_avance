import type { ProductStock, BOMProduct, BatchProduct, Anomalies_Batch, Anomalies } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
import { createError, generateUniqueCode } from "@aeronexis/services-shared";

export const PROD_STATUSES = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
} as const;

export const VALIDATION_ANOMALIES = {
  OPEN: "OPEN",
  CLOSED: "CLOSED"
} as const;

type DbClient = Pick<typeof prisma, "productStock" | "bOMProduct" | "batchProduct" | "anomalies_Batch" | "anomalies">;

export async function generateBatchCode(db: DbClient) {
    const code = `BATCH-${generateUniqueCode("BATCH", (code) => db.batchProduct.findFirst({ where: { batch_code: code } })!==null)}-`;

    return code;
}

export async function generateBOMCode(db: DbClient) {
    const code = `BOM-${generateUniqueCode("BOM", (code) => db.bOMProduct.findFirst({ where: { bom_code: code } })!==null)}-`;

    return code;
}

export async function generateAnomalyCode(db: DbClient, batch_id: string) {
    const code = `ANOMALY-${generateUniqueCode("ANOMALY", (code) => db.anomalies.findFirst({ where: { anomaly_code: code, batch_id } })!==null)}-`;

    return code;
}

export async function loadActiveBatch(db: DbClient, batch_code: string) {
  const batch = await db.batchProduct.findFirst({
    where: { batch_code, deletedAt: null, status: "PENDING"}
  });

  if (!batch) {
    throw createError("NOT_FOUND", "Batch not found");
  }

  return batch;
}

export async function loadActiveBOM(db: DbClient, bom_code: string) {
  const bom = await db.bOMProduct.findFirst({
    where: { bom_code, deletedAt: null, status: "PENDING" }
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

export async function assertStatusTransition(currStatus: string, nextStatus: string) {
  if (currStatus === PROD_STATUSES.PENDING) {
    if (
        nextStatus === PROD_STATUSES.IN_PROGRESS ||
        nextStatus === PROD_STATUSES.CANCELLED
    ) {
        return;
    }   
  }

  throw createError("INVALID_STATUS_TRANSITION", `Invalid status transition from ${currStatus} to ${nextStatus}`);
}
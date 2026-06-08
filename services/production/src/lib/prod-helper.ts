import type { ProductStock, BOMProduct, BatchProduct } from "../generated/prisma/client.js";
import { prisma } from "../db.js";
import { createError } from "./errors.js";

export const PROD_STATUSES = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
} as const;

export const VALIDATION_ACTIONS = {
  VALIDATE: "VALIDATE",
  REJECT: "REJECT"
} as const;

type DbClient = Pick<typeof prisma, "productStock" | "bOMProduct" | "batchProduct">;

export async function generateBatchCode(db: DbClient, year = new Date().getFullYear()) {
    const prefix = `BATC-${year}-`;

    const latest = await db.batchProduct.findFirst({
        where: {
            batch_code: { startsWith: prefix },
            deletedAt: null
        },
        orderBy: { batch_code: "desc" },
        select: { batch_code: true }
    });

    let sequence = 1;

    if (latest?.batch_code) {
        const suffix = latest.batch_code.slice(prefix.length);
        const parsed = Number.parseInt(suffix, 10);
        if (!Number.isNaN(parsed)) {
            sequence = parsed + 1;
        }
    }

    return `${prefix}${String(sequence).padStart(5, "0")}`;
}

export async function generateBOMCode(db: DbClient, year = new Date().getFullYear()) {
    const prefix = `BOM-${year}-`;
    
    const latest = await db.bOMProduct.findFirst({
        where: {
            bom_code: { startsWith: prefix },
            deletedAt: null
        },
        orderBy: { bom_code: "desc" },
        select: { bom_code: true }
    });

    let sequence = 1;

    if (latest?.bom_code) {
        const suffix = latest.bom_code.slice(prefix.length);
        const parsed = Number.parseInt(suffix, 10);
        if (!Number.isNaN(parsed)) {
            sequence = parsed + 1;
        }
    }

    return `${prefix}${String(sequence).padStart(5, "0")}`;
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
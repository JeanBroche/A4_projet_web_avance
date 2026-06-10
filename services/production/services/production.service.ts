import type { ServiceSchema } from "moleculer";
import type { ZodType } from "zod";
import { prisma } from "../src/db.js";
import { publishProductionEvent } from "../src/lib/events.js";
import {
  PROD_STATUSES,
  VALIDATION_ANOMALIES,
  generateBatchCode,
  generateBOMCode,
  loadBomByCode,
  loadBatchByCode,
  loadBatchById,
  loadActiveProduct,
  generateAnomalyCode,
  assertStatusTransition,
  resolveStatusFromProgress,
  recordBatchHistory,
  createDefaultSteps
} from "../src/lib/prod-helper.js";
import {
  assertSiteAccess,
  createError,
  parseOrThrow,
  requireProduction,
  requireProductionRead,
  resolveEffectiveSite
} from "@aeronexis/services-shared";
import {
  getBatchSchema,
  createBatchSchema,
  updateBatchSchema,
  deleteBatchSchema,
  listBatchSchema,
  batchProgressSchema,
  batchRescheduleSchema,
  batchHistorySchema,
  batchStepsListSchema,
  batchStepUpdateSchema,
  getBomSchema,
  createBomSchema,
  updateBomSchema,
  deleteBomSchema,
  listBomSchema,
  createProductSchema,
  updateProductSchema,
  deleteProductSchema,
  getProductSchema,
  addBatchAnomalySchema,
  updateBatchAnomalySchema
} from "../src/lib/schemas.js";

function parseParams<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    parseOrThrow(error);
  }
}

function authEmail(auth: { email?: string; sub?: string }) {
  return auth.email || auth.sub || "unknown";
}

function requireUserSiteCode(auth: { siteId: string | null; roles: string[] }) {
  if (!auth.siteId && !auth.roles?.includes("admin")) {
    throw createError("FORBIDDEN", "User has no site assignment");
  }
  return auth.siteId ?? "SITE-LYO";
}

const ProductionService: ServiceSchema = {
  name: "production",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    },

    "bom.create": {
      async handler(ctx) {
        const params = parseParams(createBomSchema, ctx.params);
        requireProduction(ctx, params.accessToken);

        const bom = await prisma.$transaction(async (tx) => {
          const bom_code = await generateBOMCode(tx);
          return tx.bOMProduct.create({
            data: {
              bom_code,
              material_id: params.material_id,
              description: params.description,
              quantity: params.quantity,
              status: PROD_STATUSES.PENDING
            }
          });
        });

        publishProductionEvent(this, "bom.created", {
          bom_id: bom.id,
          bom_code: bom.bom_code,
          material_id: bom.material_id
        });

        this.logger.info("BOM created", {
          correlationId: ctx.meta.correlationId,
          bom_code: bom.bom_code
        });

        return bom;
      }
    },

    "bom.list": {
      async handler(ctx) {
        const params = parseParams(listBomSchema, ctx.params);
        requireProduction(ctx, params.accessToken);

        const where = {
          deletedAt: null,
          ...(params.status ? { status: params.status } : {})
        };

        const [items, total] = await Promise.all([
          prisma.bOMProduct.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: params.limit ?? 50,
            skip: params.offset ?? 0
          }),
          prisma.bOMProduct.count({ where })
        ]);

        return { total, limit: params.limit ?? 50, offset: params.offset ?? 0, items };
      }
    },

    "bom.get": {
      async handler(ctx) {
        const params = parseParams(getBomSchema, ctx.params);
        requireProduction(ctx, params.accessToken);

        const bom = await loadBomByCode(prisma, params.bom_code);
        this.logger.info("BOM retrieved", {
          correlationId: ctx.meta.correlationId,
          bom_code: params.bom_code
        });
        return bom;
      }
    },

    "bom.update": {
      async handler(ctx) {
        const params = parseParams(updateBomSchema, ctx.params);
        requireProduction(ctx, params.accessToken);

        const updatedBom = await prisma.$transaction(async (tx) => {
          const existingBom = await loadBomByCode(tx, params.bom_code);
          if (params.status) {
            assertStatusTransition(existingBom.status, params.status);
          }
          return tx.bOMProduct.update({
            where: { id: existingBom.id },
            data: {
              material_id: params.material_id,
              description: params.description,
              quantity: params.quantity,
              status: params.status
            }
          });
        });

        this.logger.info("BOM updated", {
          correlationId: ctx.meta.correlationId,
          bom_code: params.bom_code
        });
        return updatedBom;
      }
    },

    "bom.delete": {
      async handler(ctx) {
        const params = parseParams(deleteBomSchema, ctx.params);
        requireProduction(ctx, params.accessToken);

        const deletedBom = await prisma.$transaction(async (tx) => {
          const existingBom = await loadBomByCode(tx, params.bom_code);
          return tx.bOMProduct.update({
            where: { id: existingBom.id },
            data: { deletedAt: new Date() }
          });
        });

        this.logger.info("BOM deleted", {
          correlationId: ctx.meta.correlationId,
          bom_code: params.bom_code
        });
        return deletedBom;
      }
    },

    "batch.create": {
      async handler(ctx) {
        const params = parseParams(createBatchSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const siteCode = requireUserSiteCode(auth);

        const batch = await prisma.$transaction(async (tx) => {
          const existingBom = await loadBomByCode(tx, params.bom_code);
          const batch_code = await generateBatchCode(tx);
          const created = await tx.batchProduct.create({
            data: {
              batch_code,
              bom_id: existingBom.id,
              command_id: params.command_id,
              siteCode,
              status: PROD_STATUSES.PENDING,
              plannedStartAt: params.plannedStartAt,
              plannedEndAt: params.plannedEndAt
            }
          });
          await createDefaultSteps(tx, created.batch_id);
          await recordBatchHistory(
            tx,
            created.batch_id,
            "batch.created",
            `Lot ${batch_code} cree pour BOM ${params.bom_code}`,
            authEmail(auth)
          );
          return created;
        });

        publishProductionEvent(this, "batch.created", {
          batch_id: batch.batch_id,
          batch_code: batch.batch_code,
          bom_id: batch.bom_id
        });

        this.logger.info("Batch created", {
          correlationId: ctx.meta.correlationId,
          batch_code: batch.batch_code
        });
        return batch;
      }
    },

    "batch.list": {
      async handler(ctx) {
        const params = parseParams(listBatchSchema, ctx.params);
        const auth = requireProductionRead(ctx, params.accessToken);
        const effectiveSite = resolveEffectiveSite(auth, params);

        let bom_id: string | undefined;
        if (params.bom_code) {
          const bom = await loadBomByCode(prisma, params.bom_code);
          bom_id = bom.id;
        }

        const where = {
          deletedAt: null,
          ...(params.status ? { status: params.status } : {}),
          ...(bom_id ? { bom_id } : {}),
          ...(effectiveSite ? { siteCode: effectiveSite } : {})
        };

        const [items, total] = await Promise.all([
          prisma.batchProduct.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: params.limit ?? 50,
            skip: params.offset ?? 0
          }),
          prisma.batchProduct.count({ where })
        ]);

        return { total, limit: params.limit ?? 50, offset: params.offset ?? 0, items };
      }
    },

    "batch.get": {
      async handler(ctx) {
        const params = parseParams(getBatchSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const batch = await loadBatchByCode(prisma, params.batch_code);
        assertSiteAccess(auth, batch.siteCode);
        this.logger.info("Batch retrieved", {
          correlationId: ctx.meta.correlationId,
          batch_code: params.batch_code
        });
        return batch;
      }
    },

    "batch.update": {
      async handler(ctx) {
        const params = parseParams(updateBatchSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const updatedBatch = await prisma.$transaction(async (tx) => {
          const existingBatch = await loadBatchByCode(tx, params.batch_code);
          assertSiteAccess(auth, existingBatch.siteCode);
          if (params.status) {
            assertStatusTransition(existingBatch.status, params.status);
          }
          const updated = await tx.batchProduct.update({
            where: { batch_id: existingBatch.batch_id },
            data: {
              bom_id: params.bom_code
                ? (await loadBomByCode(tx, params.bom_code)).id
                : undefined,
              status: params.status
            }
          });
          if (params.status) {
            await recordBatchHistory(
              tx,
              existingBatch.batch_id,
              "batch.status_changed",
              `${existingBatch.status} -> ${params.status}`,
              authEmail(auth)
            );
          }
          return updated;
        });

        this.logger.info("Batch updated", {
          correlationId: ctx.meta.correlationId,
          batch_code: params.batch_code
        });
        return updatedBatch;
      }
    },

    "batch.delete": {
      async handler(ctx) {
        const params = parseParams(deleteBatchSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const deletedBatch = await prisma.$transaction(async (tx) => {
          const existingBatch = await loadBatchByCode(tx, params.batch_code);
          assertSiteAccess(auth, existingBatch.siteCode);
          return tx.batchProduct.update({
            where: { batch_id: existingBatch.batch_id },
            data: { deletedAt: new Date() }
          });
        });

        this.logger.info("Batch deleted", {
          correlationId: ctx.meta.correlationId,
          batch_code: params.batch_code
        });
        return deletedBatch;
      }
    },

    "batch.progress": {
      async handler(ctx) {
        const params = parseParams(batchProgressSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const updated = await prisma.$transaction(async (tx) => {
          const existing = await loadBatchByCode(tx, params.batch_code);
          assertSiteAccess(auth, existing.siteCode);
          const nextStatus = resolveStatusFromProgress(params.percent, existing.status);
          if (nextStatus !== existing.status) {
            assertStatusTransition(existing.status, nextStatus);
          }
          const batch = await tx.batchProduct.update({
            where: { batch_id: existing.batch_id },
            data: {
              progress: params.percent,
              status: nextStatus
            }
          });
          await recordBatchHistory(
            tx,
            existing.batch_id,
            "batch.progress",
            `Avancement ${params.percent}%`,
            authEmail(auth)
          );
          return batch;
        });

        publishProductionEvent(this, "batch.progress", {
          batch_id: updated.batch_id,
          progress: updated.progress,
          status: updated.status
        });

        return updated;
      }
    },

    "batch.reschedule": {
      async handler(ctx) {
        const params = parseParams(batchRescheduleSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (params.plannedEndAt < params.plannedStartAt) {
          throw createError("VALIDATION_ERROR", "plannedEndAt must be after plannedStartAt");
        }

        const updated = await prisma.$transaction(async (tx) => {
          const existing = await loadBatchByCode(tx, params.batch_code);
          assertSiteAccess(auth, existing.siteCode);
          const batch = await tx.batchProduct.update({
            where: { batch_id: existing.batch_id },
            data: {
              plannedStartAt: params.plannedStartAt,
              plannedEndAt: params.plannedEndAt
            }
          });
          await recordBatchHistory(
            tx,
            existing.batch_id,
            "batch.rescheduled",
            `Replanifie ${params.plannedStartAt.toISOString()} -> ${params.plannedEndAt.toISOString()}`,
            authEmail(auth)
          );
          return batch;
        });

        return updated;
      }
    },

    "batch.history": {
      async handler(ctx) {
        const params = parseParams(batchHistorySchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const batch = await loadBatchByCode(prisma, params.batch_code);
        assertSiteAccess(auth, batch.siteCode);
        const where = { batch_id: batch.batch_id };

        const [items, total] = await Promise.all([
          prisma.batchActionHistory.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: params.limit ?? 50,
            skip: params.offset ?? 0
          }),
          prisma.batchActionHistory.count({ where })
        ]);

        return { total, limit: params.limit ?? 50, offset: params.offset ?? 0, items };
      }
    },

    "batch.steps.list": {
      async handler(ctx) {
        const params = parseParams(batchStepsListSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const batch = await loadBatchByCode(prisma, params.batch_code);
        assertSiteAccess(auth, batch.siteCode);
        const steps = await prisma.productionStep.findMany({
          where: { batch_id: batch.batch_id },
          orderBy: { order_index: "asc" }
        });

        return { batch_code: params.batch_code, steps };
      }
    },

    "batch.steps.update": {
      async handler(ctx) {
        const params = parseParams(batchStepUpdateSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const step = await prisma.$transaction(async (tx) => {
          const batch = await loadBatchByCode(tx, params.batch_code);
          assertSiteAccess(auth, batch.siteCode);
          const existing = await tx.productionStep.findFirst({
            where: { batch_id: batch.batch_id, step_code: params.step_code }
          });
          if (!existing) {
            throw createError("NOT_FOUND", `Step not found: ${params.step_code}`);
          }
          const updated = await tx.productionStep.update({
            where: { id: existing.id },
            data: { status: params.status }
          });
          await recordBatchHistory(
            tx,
            batch.batch_id,
            "batch.step_updated",
            `${params.step_code} -> ${params.status}`,
            authEmail(auth)
          );
          return updated;
        });

        return step;
      }
    },

    "batch.addAnomalies": {
      async handler(ctx) {
        const params = parseParams(addBatchAnomalySchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const anomaly = await prisma.$transaction(async (tx) => {
          const existingBatch = await loadBatchById(tx, params.batch_id);
          assertSiteAccess(auth, existingBatch.siteCode);
          const created = await tx.anomalies.create({
            data: {
              batch_id: existingBatch.batch_id,
              anomaly_code: await generateAnomalyCode(tx, existingBatch.batch_id),
              description: params.description,
              status: VALIDATION_ANOMALIES.OPEN
            }
          });
          await tx.anomalies_Batch.create({
            data: {
              batch_id: existingBatch.batch_id,
              anomaly_id: created.anomaly_id
            }
          });
          await recordBatchHistory(
            tx,
            existingBatch.batch_id,
            "batch.anomaly_reported",
            created.anomaly_code,
            authEmail(auth)
          );
          return created;
        });

        publishProductionEvent(this, "batch.anomaly_reported", {
          anomaly_id: anomaly.anomaly_id,
          batch_id: anomaly.batch_id
        });

        this.logger.info("Batch anomaly added", {
          correlationId: ctx.meta.correlationId,
          batch_id: params.batch_id
        });
        return anomaly;
      }
    },

    "batch.updateAnomalies": {
      async handler(ctx) {
        const params = parseParams(updateBatchAnomalySchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const updatedAnomaly = await prisma.$transaction(async (tx) => {
          const existingBatch = await loadBatchById(tx, params.batch_id);
          assertSiteAccess(auth, existingBatch.siteCode);
          const existingAnomaly = await tx.anomalies.findFirst({
            where: {
              anomaly_code: params.anomaly_code,
              batch_id: existingBatch.batch_id
            }
          });

          if (!existingAnomaly) {
            throw createError("NOT_FOUND", "Anomaly not found: " + params.anomaly_code);
          }

          const updated = await tx.anomalies.update({
            where: { anomaly_id: existingAnomaly.anomaly_id },
            data: {
              description: params.description,
              status: params.status ?? VALIDATION_ANOMALIES.CLOSED
            }
          });
          await recordBatchHistory(
            tx,
            existingBatch.batch_id,
            "batch.anomaly_updated",
            `${params.anomaly_code} -> ${updated.status}`,
            authEmail(auth)
          );
          return updated;
        });

        this.logger.info("Batch anomaly updated", {
          correlationId: ctx.meta.correlationId,
          batch_id: params.batch_id,
          anomaly_code: params.anomaly_code
        });
        return updatedAnomaly;
      }
    },

    "product.create": {
      async handler(ctx) {
        const params = parseParams(createProductSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);
        assertSiteAccess(auth, params.siteCode);

        const product = await prisma.productStock.create({
          data: {
            productCode: params.product_code,
            description: params.description,
            quantity: params.quantity,
            siteCode: params.siteCode
          }
        });

        this.logger.info("Product created", {
          correlationId: ctx.meta.correlationId,
          product_code: params.product_code
        });
        return product;
      }
    },

    "product.get": {
      async handler(ctx) {
        const params = parseParams(getProductSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const product = await prisma.productStock.findFirst({
          where: { productCode: params.product_code, deletedAt: null }
        });
        if (!product) {
          throw createError("NOT_FOUND", "Product not found");
        }
        assertSiteAccess(auth, product.siteCode);
        return product;
      }
    },

    "product.update": {
      async handler(ctx) {
        const params = parseParams(updateProductSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const updatedProduct = await prisma.$transaction(async (tx) => {
          const existingProduct = await loadActiveProduct(tx, params.product_code);
          assertSiteAccess(auth, existingProduct.siteCode);
          if (params.siteCode) {
            assertSiteAccess(auth, params.siteCode);
          }
          return tx.productStock.update({
            where: { id: existingProduct.id },
            data: {
              description: params.description,
              quantity: params.quantity,
              siteCode: params.siteCode
            }
          });
        });

        this.logger.info("Product updated", {
          correlationId: ctx.meta.correlationId,
          product_code: params.product_code
        });
        return updatedProduct;
      }
    },

    "product.delete": {
      async handler(ctx) {
        const params = parseParams(deleteProductSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        const deletedProduct = await prisma.$transaction(async (tx) => {
          const existingProduct = await loadActiveProduct(tx, params.product_code);
          assertSiteAccess(auth, existingProduct.siteCode);
          return tx.productStock.update({
            where: { id: existingProduct.id },
            data: { deletedAt: new Date() }
          });
        });

        this.logger.info("Product deleted", {
          correlationId: ctx.meta.correlationId,
          product_code: params.product_code
        });
        return deletedProduct;
      }
    }
  }
};

export default ProductionService;

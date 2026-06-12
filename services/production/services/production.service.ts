import type { Service, ServiceSchema } from "moleculer";
import { DomainEvents } from "@aeronexis/shared";
import { prisma } from "../src/db.js";
import { initProductionAuditWriter, logProductionMutation } from "../src/lib/audit.js";
import { publishProductionEvent } from "../src/lib/events.js";
import {
  buildManuOrderFinishedPayload,
  reserveMaterialsForBatch
} from "../src/lib/production-integration.js";
import {
  PROD_STATUSES,
  VALIDATION_ANOMALIES,
  generateBatchCode,
  generateBOMCode,
  loadBomByCode,
  loadBomLines,
  replaceBomLines,
  loadBatchByCode,
  loadBatchById,
  loadActiveProduct,
  generateAnomalyCode,
  assertStatusTransition,
  resolveStatusFromProgress,
  recordBatchHistory,
  createDefaultSteps,
  syncBatchProgressFromSteps,
  type BomLineInput
} from "../src/lib/production-helpers.js";
import {
  assertSiteAccess,
  createError,
  parseParams,
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

function authEmail(auth: { email?: string; sub?: string }) {
  return auth.email || auth.sub || "unknown";
}

function requireUserSiteCode(auth: { siteId: string | null; roles: string[] }) {
  if (!auth.siteId && !auth.roles?.includes("admin")) {
    throw createError("FORBIDDEN", "User has no site assignment");
  }
  return auth.siteId ?? "SITE-LYO";
}

function resolveBomLinesInput(params: {
  material_id?: string;
  quantity?: number;
  lines?: BomLineInput[];
}): BomLineInput[] {
  if (params.lines?.length) {
    return params.lines;
  }
  if (params.material_id) {
    return [{ material_id: params.material_id, quantity: params.quantity ?? 1 }];
  }
  return [];
}

const ProductionService: ServiceSchema = {
  name: "production",

  started(this: Service) {
    initProductionAuditWriter(this);
  },

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
        const auth = await requireProduction(ctx, params.accessToken);
        const siteCode = requireUserSiteCode(auth);

        const lines = resolveBomLinesInput(params);
        const primaryLine = lines[0];

        const bom = await prisma.$transaction(async (tx) => {
          const bom_code = await generateBOMCode(tx);
          const created = await tx.bOMProduct.create({
            data: {
              bom_code,
              material_id: primaryLine.material_id,
              description: params.description,
              quantity: primaryLine.quantity,
              status: PROD_STATUSES.PENDING,
              siteCode
            }
          });
          await replaceBomLines(tx, created.id, lines);
          return created;
        });

        publishProductionEvent(this, DomainEvents.production.bomCreated, {
          bom_id: bom.id,
          bom_code: bom.bom_code,
          material_id: bom.material_id
        });

        this.logger.info("BOM created", {
          correlationId: ctx.meta.correlationId,
          bom_code: bom.bom_code
        });

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.bom.create",
          entity: "BOMProduct",
          entityId: bom.id,
          metadata: { bom_code: bom.bom_code }
        });

        return bom;
      }
    },

    "bom.list": {
      async handler(ctx) {
        const params = parseParams(listBomSchema, ctx.params);
        await requireProductionRead(ctx, params.accessToken);

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

        const itemsWithLines = await Promise.all(
          items.map(async (bom) => ({
            ...bom,
            lines: await loadBomLines(prisma, bom.id)
          }))
        );

        return { total, limit: params.limit ?? 50, offset: params.offset ?? 0, items: itemsWithLines };
      }
    },

    "bom.get": {
      async handler(ctx) {
        const params = parseParams(getBomSchema, ctx.params);
        await requireProductionRead(ctx, params.accessToken);

        const bom = await loadBomByCode(prisma, params.bom_code);
        const lines = await loadBomLines(prisma, bom.id);
        this.logger.info("BOM retrieved", {
          correlationId: ctx.meta.correlationId,
          bom_code: params.bom_code
        });
        return { ...bom, lines };
      }
    },

    "bom.update": {
      async handler(ctx) {
        const params = parseParams(updateBomSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

        const updatedBom = await prisma.$transaction(async (tx) => {
          const existingBom = await loadBomByCode(tx, params.bom_code);
          if (params.status) {
            assertStatusTransition(existingBom.status, params.status);
          }
          const nextLines = params.lines ?? (params.material_id
            ? [{ material_id: params.material_id, quantity: params.quantity ?? existingBom.quantity }]
            : null);
          const primaryLine = nextLines?.[0];
          const updated = await tx.bOMProduct.update({
            where: { id: existingBom.id },
            data: {
              material_id: primaryLine?.material_id ?? params.material_id,
              description: params.description,
              quantity: primaryLine?.quantity ?? params.quantity,
              status: params.status
            }
          });
          if (nextLines) {
            await replaceBomLines(tx, existingBom.id, nextLines);
          }
          return updated;
        });

        this.logger.info("BOM updated", {
          correlationId: ctx.meta.correlationId,
          bom_code: params.bom_code
        });

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.bom.update",
          entity: "BOMProduct",
          entityId: updatedBom.id,
          metadata: { bom_code: params.bom_code }
        });

        return updatedBom;
      }
    },

    "bom.delete": {
      async handler(ctx) {
        const params = parseParams(deleteBomSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.bom.delete",
          entity: "BOMProduct",
          entityId: deletedBom.id,
          metadata: { bom_code: params.bom_code }
        });

        return deletedBom;
      }
    },

    "batch.create": {
      async handler(ctx) {
        const params = parseParams(createBatchSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

        const siteCode = requireUserSiteCode(auth);
        const existingBom = await loadBomByCode(prisma, params.bom_code);
        const bomLines = await loadBomLines(prisma, existingBom.id);
        const batch_code = await generateBatchCode(prisma);

        await reserveMaterialsForBatch(ctx, {
          batchCode: batch_code,
          orderNumber: params.command_id,
          siteCode,
          lines: bomLines,
          accessToken: params.accessToken
        });

        const batch = await prisma.$transaction(async (tx) => {
          const bom = await loadBomByCode(tx, params.bom_code);
          const created = await tx.batchProduct.create({
            data: {
              batch_code,
              bom_id: bom.id,
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

        publishProductionEvent(this, DomainEvents.production.batchCreated, {
          batch_id: batch.batch_id,
          batch_code: batch.batch_code,
          bom_id: batch.bom_id,
          command_id: batch.command_id,
          siteCode: batch.siteCode,
          status: batch.status
        });

        this.logger.info("Batch created", {
          correlationId: ctx.meta.correlationId,
          batch_code: batch.batch_code
        });

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.batch.create",
          entity: "BatchProduct",
          entityId: batch.batch_id,
          siteCode: batch.siteCode,
          metadata: { batch_code: batch.batch_code, command_id: batch.command_id }
        });

        return batch;
      }
    },

    "batch.list": {
      async handler(ctx) {
        const params = parseParams(listBatchSchema, ctx.params);
        const auth = await requireProductionRead(ctx, params.accessToken);
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
        const auth = await requireProduction(ctx, params.accessToken);

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
        const auth = await requireProduction(ctx, params.accessToken);

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

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.batch.update",
          entity: "BatchProduct",
          entityId: updatedBatch.batch_id,
          siteCode: updatedBatch.siteCode,
          metadata: { batch_code: params.batch_code, status: params.status }
        });

        return updatedBatch;
      }
    },

    "batch.delete": {
      async handler(ctx) {
        const params = parseParams(deleteBatchSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.batch.delete",
          entity: "BatchProduct",
          entityId: deletedBatch.batch_id,
          siteCode: deletedBatch.siteCode,
          metadata: { batch_code: params.batch_code }
        });

        return deletedBatch;
      }
    },

    "batch.progress": {
      async handler(ctx) {
        const params = parseParams(batchProgressSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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

        publishProductionEvent(this, DomainEvents.production.batchProgress, {
          batch_id: updated.batch_id,
          batch_code: updated.batch_code,
          command_id: updated.command_id,
          siteCode: updated.siteCode,
          progress: updated.progress,
          status: updated.status
        });

        if (updated.status === PROD_STATUSES.COMPLETED) {
          publishProductionEvent(
            this,
            DomainEvents.production.manuOrderFinished,
            buildManuOrderFinishedPayload(updated)
          );
        }

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.batch.progress",
          entity: "BatchProduct",
          entityId: updated.batch_id,
          siteCode: updated.siteCode,
          metadata: { batch_code: params.batch_code, progress: params.percent }
        });

        return updated;
      }
    },

    "batch.reschedule": {
      async handler(ctx) {
        const params = parseParams(batchRescheduleSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.batch.reschedule",
          entity: "BatchProduct",
          entityId: updated.batch_id,
          siteCode: updated.siteCode,
          metadata: { batch_code: params.batch_code }
        });

        return updated;
      }
    },

    "batch.history": {
      async handler(ctx) {
        const params = parseParams(batchHistorySchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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
        const auth = await requireProduction(ctx, params.accessToken);

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
        const auth = await requireProduction(ctx, params.accessToken);

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
          const syncedBatch = await syncBatchProgressFromSteps(tx, batch.batch_id);
          if (syncedBatch.progress > 0) {
            await recordBatchHistory(
              tx,
              batch.batch_id,
              "batch.progress",
              `Avancement ${syncedBatch.progress}%`,
              authEmail(auth)
            );
          }
          return { step: updated, batch: syncedBatch };
        });

        publishProductionEvent(this, DomainEvents.production.batchProgress, {
          batch_id: step.batch.batch_id,
          batch_code: step.batch.batch_code,
          command_id: step.batch.command_id,
          siteCode: step.batch.siteCode,
          progress: step.batch.progress,
          status: step.batch.status
        });

        if (step.batch.status === PROD_STATUSES.COMPLETED) {
          publishProductionEvent(
            this,
            DomainEvents.production.manuOrderFinished,
            buildManuOrderFinishedPayload(step.batch)
          );
        }

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.batch.steps.update",
          entity: "ProductionStep",
          entityId: step.step.id,
          metadata: {
            batch_code: params.batch_code,
            step_code: params.step_code,
            progress: step.batch.progress
          }
        });

        return step.step;
      }
    },

    "batch.addAnomalies": {
      async handler(ctx) {
        const params = parseParams(addBatchAnomalySchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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
          return { anomaly: created, batch: existingBatch };
        });

        publishProductionEvent(this, DomainEvents.production.batchAnomalyReported, {
          anomaly_id: anomaly.anomaly.anomaly_id,
          anomaly_code: anomaly.anomaly.anomaly_code,
          batch_id: anomaly.anomaly.batch_id,
          batch_code: anomaly.batch.batch_code,
          command_id: anomaly.batch.command_id,
          siteCode: anomaly.batch.siteCode,
          description: params.description,
          severity: params.severity
        });

        if (params.severity === "HIGH" || params.severity === "CRITICAL") {
          this.broker.emit(DomainEvents.audit.incidentReported, {
            severity: params.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
            type: "production.anomaly",
            message: `Anomalie ${anomaly.anomaly.anomaly_code} sur lot ${anomaly.batch.batch_code}: ${params.description}`,
            siteCode: anomaly.batch.siteCode,
            actorId: auth.sub,
            metadata: {
              anomaly_id: anomaly.anomaly.anomaly_id,
              anomaly_code: anomaly.anomaly.anomaly_code,
              batch_id: anomaly.batch.batch_id,
              batch_code: anomaly.batch.batch_code,
              command_id: anomaly.batch.command_id
            },
            correlationId: ctx.meta.correlationId
          });
        }

        this.logger.info("Batch anomaly added", {
          correlationId: ctx.meta.correlationId,
          batch_id: params.batch_id
        });

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.batch.addAnomalies",
          entity: "Anomaly",
          entityId: anomaly.anomaly.anomaly_id,
          metadata: { batch_id: params.batch_id, anomaly_code: anomaly.anomaly.anomaly_code }
        });

        return anomaly.anomaly;
      }
    },

    "batch.updateAnomalies": {
      async handler(ctx) {
        const params = parseParams(updateBatchAnomalySchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.batch.updateAnomalies",
          entity: "Anomaly",
          entityId: updatedAnomaly.anomaly_id,
          metadata: { batch_id: params.batch_id, anomaly_code: params.anomaly_code }
        });

        return updatedAnomaly;
      }
    },

    "product.create": {
      async handler(ctx) {
        const params = parseParams(createProductSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);
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

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.product.create",
          entity: "ProductStock",
          entityId: product.id,
          siteCode: product.siteCode,
          metadata: { product_code: params.product_code }
        });

        return product;
      }
    },

    "product.get": {
      async handler(ctx) {
        const params = parseParams(getProductSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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
        const auth = await requireProduction(ctx, params.accessToken);

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

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.product.update",
          entity: "ProductStock",
          entityId: updatedProduct.id,
          siteCode: updatedProduct.siteCode,
          metadata: { product_code: params.product_code }
        });

        return updatedProduct;
      }
    },

    "product.delete": {
      async handler(ctx) {
        const params = parseParams(deleteProductSchema, ctx.params);
        const auth = await requireProduction(ctx, params.accessToken);

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

        await logProductionMutation(auth, ctx.meta.correlationId, {
          action: "production.product.delete",
          entity: "ProductStock",
          entityId: deletedProduct.id,
          siteCode: deletedProduct.siteCode,
          metadata: { product_code: params.product_code }
        });

        return deletedProduct;
      }
    }
  }
};

export default ProductionService;

import type { ServiceSchema } from "moleculer";
import { prisma } from "../src/db.js";
import { publishProductionEvent } from "../src/lib/events.js";
import type { ZodType } from "zod";

import {
  PROD_STATUSES,
  VALIDATION_ANOMALIES,
  generateBatchCode,
  generateBOMCode,
  loadActiveBOM,
  loadActiveBatch,
  loadActiveProduct,
  generateAnomalyCode
} from "../src/lib/prod-helper.js";
import { requireProduction, createError, parseOrThrow } from "@aeronexis/services-shared";
import {
  getBatchSchema,
  createBatchSchema,
  updateBatchSchema,
  deleteBatchSchema,
  getBomSchema,
  createBomSchema,
  updateBomSchema,
  deleteBomSchema,
  createProductSchema,
  updateProductSchema,
  deleteProductSchema,
  getProductSchema,
  updateBatchAnomalySchema,
  anomalyLineSchema,
} from "../src/lib/schemas.js";

function parseParams<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    parseOrThrow(error);
  }
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
      async handler(ctx){
        const params = parseParams(createBomSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const order_creation = await prisma.$transaction(async (tx) => {
          const bom_code = await generateBOMCode(tx);
          return tx.bOMProduct.create({
              data: {
                bom_code,
                material_id: params.material_id,
                description: params.description,
                quantity: params.quantity,
                status: PROD_STATUSES.PENDING
              }
            })
          });

        publishProductionEvent(this, "bom.created", {
          bom_id: order_creation.id,
          bom_code: order_creation.bom_code,
          material_id: order_creation.material_id,
          description: order_creation.description,
          quantity: order_creation.quantity,
        });

        this.logger.info("BOM created", { correlationId: ctx.meta.correlationId, bom_code: order_creation });

        return order_creation;
      }
    },

    "bom.get": {
      async handler(ctx){
        const params = parseParams(getBomSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const bom = await loadActiveBOM(prisma, params.bom_code);

        this.logger.info("BOM retrieved", { correlationId: ctx.meta.correlationId, bom_code: params.bom_code });
        return bom;
      }
    },

    "bom.update": {
      async handler(ctx){
        const params = parseParams(updateBomSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const updatedBom = await prisma.$transaction(async (tx) => {
          const existingBom = await loadActiveBOM(tx, params.bom_code);
          return tx.bOMProduct.update({
            where: { id: existingBom.id },
            data: {
              material_id: params.material_id,
              description: params.description,
              quantity: params.quantity,
            }
          });
        });

        this.logger.info("BOM updated", { correlationId: ctx.meta.correlationId, bom_code: params.bom_code });
        return updatedBom;
      }
    },

    "bom.delete": {
      async handler(ctx){
        const params = parseParams(deleteBomSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const deletedBom = await prisma.$transaction(async (tx) => {
          const existingBom = await loadActiveBOM(tx, params.bom_code);
          return tx.bOMProduct.update({
            where: { id: existingBom.id },
            data: {
              deletedAt: new Date()
            }
          });
        });

        this.logger.info("BOM deleted", { correlationId: ctx.meta.correlationId, bom_code: params.bom_code });
        return deletedBom;
      }
    },

    "batch.create": {
      async handler(ctx){
        const params = parseParams(createBatchSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const batch = await prisma.$transaction(async (tx) => {
          const existingBom = await loadActiveBOM(tx, params.bom_code);
          if (!existingBom) {
            throw createError("NOT_FOUND", "BOM not found: " + params.bom_code);
          }

          const batch_code = await generateBatchCode(tx);
          return tx.batchProduct.create({
            data: {
              batch_code: batch_code,
              bom_id: existingBom.id,
              command_id: params.command_id,
              status: PROD_STATUSES.PENDING,
            }
          });
        });

        this.logger.info("Batch created", { correlationId: ctx.meta.correlationId, batch_code: params.batch_code });
        return batch;
      }
    },

    "batch.get": {
      async handler(ctx){
        const params = parseParams(getBatchSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const batch = await loadActiveBatch(prisma, params.batch_code);

        this.logger.info("Batch retrieved", { correlationId: ctx.meta.correlationId, batch_code: params.batch_code });
        return batch;
      }
    },

    "batch.update": {
      async handler(ctx){
        const params = parseParams(updateBatchSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const updatedBatch = await prisma.$transaction(async (tx) => {
          const existingBatch = await loadActiveBatch(tx, params.batch_code);
          if (!existingBatch) {
            throw createError("NOT_FOUND", "Batch not found: " + params.batch_code);
          }
          return tx.batchProduct.update({
            where: { batch_id: existingBatch.batch_id },
            data: {
              bom_id: params.bom_code ? (await loadActiveBOM(tx, params.bom_code)).id : undefined,
              status: params.status,
            }
          });
        });

        this.logger.info("Batch updated", { correlationId: ctx.meta.correlationId, batch_code: params.batch_code });
        return updatedBatch;
      }
    },

    "batch.delete": {
      async handler(ctx){
        const params = parseParams(deleteBatchSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const deletedBatch = await prisma.$transaction(async (tx) => {
          const existingBatch = await loadActiveBatch(tx, params.batch_code);
          if (!existingBatch) {
            throw createError("NOT_FOUND", "Batch not found: " + params.batch_code);
          }
          return tx.batchProduct.update({
            where: { batch_id: existingBatch.batch_id },
            data: {
              deletedAt: new Date()
            }
          });
        });

        this.logger.info("Batch deleted", { correlationId: ctx.meta.correlationId, batch_code: params.batch_code });
        return deletedBatch;
      }
    },

    "batch.addAnomalies": {
      async handler(ctx){
        const params = parseParams(updateBatchAnomalySchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const updatedBatch = await prisma.$transaction(async (tx) => {
          const existingBatch = await loadActiveBatch(tx, params.batch_id);
          if (!existingBatch) {
            throw createError("NOT_FOUND", "Batch not found: " + params.batch_id);
          }
          
          const anomaly = await tx.anomalies.create({
            data: {
              batch_id: existingBatch.batch_id,
              anomaly_code: await generateAnomalyCode(tx, existingBatch.batch_id),
              description: params.anomaly.description,
              status: VALIDATION_ANOMALIES.OPEN
            }
          })

          return anomaly;
        });
        }
      },

      "batch.updateAnomalies": {
        async handler(ctx){
          const params = parseParams(updateBatchAnomalySchema, ctx.params);
          const auth = requireProduction(ctx, params.accessToken);

          if (!auth.roles.includes("production")) {
            throw createError("FORBIDDEN");
          }

          const updatedBatch = await prisma.$transaction(async (tx) => {
            const existingBatch = await loadActiveBatch(tx, params.batch_id);
            if (!existingBatch) {
              throw createError("NOT_FOUND", "Batch not found: " + params.batch_id);
            }
            const existingAnomaly = await tx.anomalies.findFirst({
              where: { anomaly_code: params.anomaly.anomaly_code, batch_id: existingBatch.batch_id }
            });

            if (!existingAnomaly) {
              throw createError("NOT_FOUND", "Anomaly not found: " + params.anomaly.anomaly_code);
            }

            return tx.anomalies.update({
              where: { anomaly_id: existingAnomaly.anomaly_id },
              data: {
                description: params.anomaly.description,
                status: VALIDATION_ANOMALIES.CLOSED,
              }
            });
          });

          this.logger.info("Batch anomaly updated", { correlationId: ctx.meta.correlationId, batch_id: params.batch_id, anomaly_code: params.anomaly.anomaly_code });
          return updatedBatch;
        }
      },

    "product.create": {
      async handler(ctx){
        const params = parseParams(createProductSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const product = await prisma.productStock.create({
          data: {
            productCode: params.product_code,
            description: params.description,
            quantity: params.quantity,
            siteCode: params.siteCode
          }
        });

        this.logger.info("Product created", { correlationId: ctx.meta.correlationId, product_code: params.product_code });
        return product;
      }
    },

    "product.get": {
      async handler(ctx){
        const params = parseParams(getProductSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const product = await prisma.productStock.findFirst({
          where: { productCode: params.product_code, deletedAt: null }
        });
        this.logger.info("Product retrieved", { correlationId: ctx.meta.correlationId, product_code: params.product_code });
        return product;
      }
    },

    "product.update": {
      async handler(ctx){
        const params = parseParams(updateProductSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const updatedProduct = await prisma.$transaction(async (tx) => {
          const existingProduct = await loadActiveProduct(tx, params.product_code);
          if (!existingProduct) {
            throw createError("NOT_FOUND", "Product not found: " + params.product_code);
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

        this.logger.info("Product updated", { correlationId: ctx.meta.correlationId, product_code: params.product_code });
        return updatedProduct;
      }
    },

    "product.delete": {
      async handler(ctx){
        const params = parseParams(deleteProductSchema, ctx.params);
        const auth = requireProduction(ctx, params.accessToken);

        if (!auth.roles.includes("production")) {
          throw createError("FORBIDDEN");
        }

        const deletedProduct = await prisma.$transaction(async (tx) => {
          const existingProduct = await loadActiveProduct(tx, params.product_code);
          if (!existingProduct) {
            throw createError("NOT_FOUND", "Product not found: " + params.product_code);
          }
          return tx.productStock.update({
            where: { id: existingProduct.id },
            data: {
              deletedAt: new Date()
            }
          });
        });

        this.logger.info("Product deleted", { correlationId: ctx.meta.correlationId, product_code: params.product_code });
        return deletedProduct;
      }
    }
  }
};

export default ProductionService;

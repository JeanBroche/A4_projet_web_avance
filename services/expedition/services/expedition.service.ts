import type { Context, Service, ServiceSchema } from "moleculer";
import type { ZodType } from "zod";
import { prisma } from "../src/db.js";
import { createError, parseOrThrow } from "../src/lib/errors.js";
import { publishExpeditionEvent } from "../src/lib/events.js";
import { requireCommercial } from "../src/lib/rbac.js";
import {
  type ExpeditionStatus,
  expeditionByIdSchema,
  expeditionCreateSchema,
  expeditionListSchema,
  expeditionUpdateSchema
} from "../src/lib/schemas.js";

const ALLOWED_TRANSITIONS: Record<ExpeditionStatus, ExpeditionStatus[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

function parseParams<T>(schema: ZodType<T>, raw: unknown): T {
  try {
    return schema.parse(raw);
  } catch (error) {
    parseOrThrow(error);
  }
}

function assertStatusTransition(current: string, next: ExpeditionStatus) {
  const allowed = ALLOWED_TRANSITIONS[current as ExpeditionStatus] || [];
  if (!allowed.includes(next)) {
    throw createError(
      "INVALID_STATUS_TRANSITION",
      `${current} → ${next} not allowed`
    );
  }
}

async function transitionExpeditionStatus(
  this: Service,
  ctx: Context,
  updateStatus: ExpeditionStatus
) {
  const params = parseParams(expeditionUpdateSchema, ctx.params);
  requireCommercial(ctx, params.accessToken);

  const delivery = await prisma.delivery.findUnique({
    where: { id: params.id }
  });

  if (!delivery) {
    throw createError("EXPEDITION_NOT_FOUND");
  }

  assertStatusTransition(delivery.status, updateStatus);

  const updated = await prisma.delivery.update({
    where: { id: params.id },
    data: {
      status: updateStatus,
      updatedAt: new Date()
    }
  });

  publishExpeditionEvent(this, `expedition.${updateStatus}`, {
    id: updated.id,
    code: updated.code,
    status: updated.status
  });

  this.logger.info(`Expedition ${updateStatus}`, {
    correlationId: (ctx.meta as { correlationId?: string }).correlationId,
    id: updated.id,
    status: updated.status
  });

  return { expedition: updated };
}

const ExpeditionService: ServiceSchema = {
  name: "expedition",

  actions: {
    ping: {
      handler(ctx) {
        this.logger.info("Ping", { correlationId: ctx.meta.correlationId });
        return "pong";
      }
    },

    "expedition.list": {
      async handler(ctx) {
        const params = parseParams(expeditionListSchema, ctx.params);
        requireCommercial(ctx, params.accessToken);

        const expeditions = await prisma.delivery.findMany({
          where: {
            deletedAt: null,
            ...(params.siteCode ? { siteCode: params.siteCode } : {}),
            ...(params.status ? { status: params.status } : {}),
            ...(params.shippedAt ? { shippedAt: params.shippedAt } : {}),
            ...(params.code ? { code: params.code } : {})
          },
          orderBy: { createdAt: "desc" }
        });

        return { expeditions };
      }
    },

    "expedition.create": {
      async handler(ctx) {
        const params = parseParams(expeditionCreateSchema, ctx.params);
        requireCommercial(ctx, params.accessToken);

        const expedition = await prisma.delivery.create({
          data: {
            siteCode: params.siteCode,
            code: params.code,
            orderNumber: params.orderNumber,
            expectedDeliveryDate: params.expectedDeliveryDate,
            status: "pending"
          }
        });

        publishExpeditionEvent(this, "expedition.created", {
          id: expedition.id,
          code: expedition.code,
          orderNumber: expedition.orderNumber,
          siteCode: expedition.siteCode
        });

        this.logger.info("Expedition created", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          id: expedition.id,
          code: expedition.code,
          orderNumber: expedition.orderNumber,
          siteCode: expedition.siteCode
        });

        return { expedition };
      }
    },

    "expedition.update": {
      async handler(ctx) {
        const params = parseParams(expeditionUpdateSchema, ctx.params);
        requireCommercial(ctx, params.accessToken);

        const expedition = await prisma.delivery.findUnique({
          where: { id: params.id }
        });

        if (!expedition) {
          throw createError("EXPEDITION_NOT_FOUND");
        }

        if (params.status) {
          assertStatusTransition(expedition.status, params.status);
        }

        const updatedExpedition = await prisma.delivery.update({
          where: { id: params.id },
          data: {
            ...(params.code ? { code: params.code } : {}),
            ...(params.orderNumber ? { orderNumber: params.orderNumber } : {}),
            ...(params.expectedDeliveryDate
              ? { expectedDeliveryDate: params.expectedDeliveryDate }
              : {}),
            ...(params.shippedAt ? { shippedAt: params.shippedAt } : {}),
            ...(params.siteCode ? { siteCode: params.siteCode } : {}),
            ...(params.status ? { status: params.status } : {}),
            updatedAt: new Date()
          }
        });

        this.logger.info("Expedition updated", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          id: updatedExpedition.id,
          code: updatedExpedition.code,
          status: updatedExpedition.status
        });

        return { expedition: updatedExpedition };
      }
    },

    "expedition.delete": {
      async handler(ctx) {
        const params = parseParams(expeditionByIdSchema, ctx.params);
        requireCommercial(ctx, params.accessToken);

        const expedition = await prisma.delivery.findUnique({
          where: { id: params.id }
        });

        if (!expedition) {
          throw createError("EXPEDITION_NOT_FOUND");
        }

        await prisma.delivery.update({
          where: { id: params.id },
          data: { deletedAt: new Date() }
        });

        this.logger.info("Expedition deleted", {
          correlationId: (ctx.meta as { correlationId?: string }).correlationId,
          id: expedition.id,
          code: expedition.code
        });
      }
    },

    "expedition.completed": {
      async handler(ctx) {
        return transitionExpeditionStatus.call(this, ctx, "completed");
      }
    },

    "expedition.cancelled": {
      async handler(ctx) {
        return transitionExpeditionStatus.call(this, ctx, "cancelled");
      }
    },

    "expedition.in_progress": {
      async handler(ctx) {
        return transitionExpeditionStatus.call(this, ctx, "in_progress");
      }
    }
  }
};

export default ExpeditionService;

import { z } from 'zod';
import { prisma } from '../../src/db.js';

import { Context } from 'moleculer';

import { assertSiteAccess, createError, parseParams, requireCommercial } from '@aeronexis/services-shared';
import { orderCreateSchema } from '../../src/lib/schemas.js';
import {
  loadActiveClient,
  computeTotalAmount,
  generateOrderNumber,
  toOrderSummary,
  ORDER_STATUSES,
} from '../../src/lib/order-helpers.js';
import { publishOrderEvent } from '../../src/lib/events.js';
import { DomainEvents } from '@aeronexis/shared';
import { logOrderAudit } from '../../src/lib/audit.js';

type OrderCreateParams = z.infer<typeof orderCreateSchema>;
type AuthContextMeta = {
  correlationId: string;
};

export const orderCreateAction = {
  async handler(ctx: Context<OrderCreateParams, AuthContextMeta>) {
    const params = parseParams(orderCreateSchema, ctx.params);
    const auth = await requireCommercial(ctx, params.accessToken);

    const client = await loadActiveClient(prisma, params.clientId);

    if (client.siteCode !== params.siteCode) {
      throw createError(
        'VALIDATION_ERROR',
        `Client ${client.code} does not belong to site ${params.siteCode}`
      );
    }

    assertSiteAccess(auth, params.siteCode);

    const totalAmount = computeTotalAmount(params.lines);

    const order = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx);

      return tx.customerOrder.create({
        data: {
          orderNumber,
          clientId: client.id,
          siteCode: params.siteCode,
          status: ORDER_STATUSES.DRAFT,
          isUrgent: params.isUrgent ?? false,
          dueDate: params.dueDate,
          promisedDeliveryDate: params.promisedDeliveryDate,
          carrier: params.carrier,
          deliveryAddress: params.deliveryAddress ?? params.lines[0]?.description,
          emoji: params.emoji ?? "📦",
          totalAmount,
          lines: {
            create: params.lines.map((line, index) => ({
              lineNumber: index + 1,
              productCode: line.productCode,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              ofId: line.ofId,
            })),
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: ORDER_STATUSES.DRAFT,
              changedBy: auth.sub,
              notes: 'Order created',
            },
          },
        },
        include: {
          client: true,
          lines: { where: { deletedAt: null }, orderBy: { lineNumber: 'asc' } },
        },
      });
    });

    publishOrderEvent(ctx.service!, DomainEvents.order.created, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientId: order.clientId,
      siteCode: order.siteCode,
    });

    ctx.service!.logger.info('Order created', {
      correlationId: ctx.meta.correlationId,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });

    await logOrderAudit({
      action: 'order.order.create',
      actorId: auth.sub,
      actorEmail: auth.email,
      roles: auth.roles,
      entity: 'CustomerOrder',
      entityId: order.id,
      siteCode: order.siteCode,
      correlationId: ctx.meta.correlationId,
      metadata: {
        orderNumber: order.orderNumber,
        clientId: order.clientId,
        lineCount: order.lines.length
      },
      diff: {
        after: {
          status: order.status,
          totalAmount: order.totalAmount,
          isUrgent: order.isUrgent
        }
      }
    });

    return toOrderSummary(order);
  },
};

import type { Context } from "moleculer";
import { parseParams, requireDirection } from "@aeronexis/services-shared";
import { baseKpiSchema, windowedKpiSchema } from "../../src/lib/schemas.js";
import { callDownstream } from "../../src/lib/downstream.js";
import { withCache } from "../../src/lib/cache.js";

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  isUrgent: boolean;
  totalAmount: number;
  dueDate?: string | Date | null;
  promisedDeliveryDate?: string | Date | null;
  createdAt: string | Date;
};

type OrderHistoryPage = {
  total: number;
  limit: number;
  offset: number;
  items: OrderSummary[];
};

const ACTIVE_STATUSES = ["DRAFT", "VALIDATED", "IN_PRODUCTION", "SHIPPED"];

export const urgentOrdersCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(baseKpiSchema, ctx.params);
    requireDirection(ctx, params.accessToken);

    return withCache(
      ctx.service!,
      "calcul.commerciaux.urgentOrders",
      { siteCode: params.siteCode ?? null },
      async () => {
        const orders = await callDownstream<OrderSummary[]>(
          ctx,
          "commande.order.listUrgent",
          {
            ...(params.siteCode ? { siteCode: params.siteCode } : {})
          },
          params.accessToken
        );

        return {
          siteCode: params.siteCode ?? null,
          totalUrgentOrders: orders.length,
          orders: orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            dueDate: o.dueDate ?? null
          }))
        };
      }
    );
  }
};

export const delayRiskOrdersCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(windowedKpiSchema, ctx.params);
    requireDirection(ctx, params.accessToken);

    const windowDays = params.windowDays ?? 30;
    return withCache(
      ctx.service!,
      "calcul.commerciaux.delayRiskOrders",
      { siteCode: params.siteCode ?? null, windowDays },
      async () => {
        const page = await callDownstream<OrderHistoryPage>(
          ctx,
          "commande.order.history",
          {
            ...(params.siteCode ? { siteCode: params.siteCode } : {}),
            limit: 500
          },
          params.accessToken
        );

        const now = new Date();
        const windowStart = new Date(
          now.getTime() - windowDays * 24 * 60 * 60 * 1000
        );

        const lateOrders = page.items.filter((order) => {
          if (!ACTIVE_STATUSES.includes(order.status)) {
            return false;
          }
          const due = order.dueDate ? new Date(order.dueDate) : null;
          const created = new Date(order.createdAt);
          if (created < windowStart) {
            return false;
          }
          return due !== null && due < now;
        });

        return {
          siteCode: params.siteCode ?? null,
          windowDays,
          totalDelayRiskOrders: lateOrders.length,
          orders: lateOrders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            dueDate: o.dueDate ?? null
          }))
        };
      }
    );
  }
};

import type { Context } from "moleculer";
import { parseParams, requireDirection } from "@aeronexis/services-shared";
import { baseKpiSchema, windowedKpiSchema } from "../../src/lib/schemas.js";
import { callDownstream } from "../../src/lib/downstream.js";
import { withCache } from "../../src/lib/cache.js";
import { fetchOrdersInWindow } from "../../src/lib/order-fetch.js";
import { getKpiConfig } from "../../src/lib/kpi-config.js";
import { assessDelayRisk } from "../../src/lib/kpi-estimates.js";

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

export const urgentOrdersCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(baseKpiSchema, ctx.params);
    await requireDirection(ctx, params.accessToken);

    return withCache(
      ctx.service!,
      "calcul.commerciaux.urgentOrders",
      { siteCode: params.siteCode ?? null },
      async () => {
        const orders = await callDownstream<OrderSummary[]>(
          ctx,
          "order.order.listUrgent",
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
            dueDate: o.dueDate ?? null,
            promisedDeliveryDate: o.promisedDeliveryDate ?? null
          }))
        };
      }
    );
  }
};

export const delayRiskOrdersCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(windowedKpiSchema, ctx.params);
    await requireDirection(ctx, params.accessToken);

    const windowDays = params.windowDays ?? 30;
    const config = getKpiConfig();
    const now = new Date();

    return withCache(
      ctx.service!,
      "calcul.commerciaux.delayRiskOrders",
      { siteCode: params.siteCode ?? null, windowDays },
      async () => {
        const orders = await fetchOrdersInWindow(ctx, {
          siteCode: params.siteCode,
          windowDays,
          accessToken: params.accessToken
        });

        const atRisk = orders
          .map((order) => ({
            order,
            risk: assessDelayRisk(order, now)
          }))
          .filter(({ risk }) => risk.score >= config.delayRiskScoreThreshold)
          .sort((a, b) => b.risk.score - a.risk.score);

        return {
          siteCode: params.siteCode ?? null,
          windowDays,
          scoreThreshold: config.delayRiskScoreThreshold,
          totalDelayRiskOrders: atRisk.length,
          orders: atRisk.map(({ order, risk }) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            dueDate: order.dueDate ?? null,
            promisedDeliveryDate: order.promisedDeliveryDate ?? null,
            score: risk.score,
            daysRemaining: risk.daysRemaining,
            factors: risk.factors
          }))
        };
      }
    );
  }
};

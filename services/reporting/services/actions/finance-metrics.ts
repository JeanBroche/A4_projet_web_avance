import type { Context } from "moleculer";
import { parseParams, requireDirection } from "@aeronexis/services-shared";
import { windowedKpiSchema } from "../../src/lib/schemas.js";
import { withCache } from "../../src/lib/cache.js";
import { fetchOrdersInWindow } from "../../src/lib/order-fetch.js";
import { getKpiConfig } from "../../src/lib/kpi-config.js";
import {
  estimateDelayPenalty,
  estimateOrderCost,
  estimateOrderRevenue,
  isActiveOrder,
  countDaysLate
} from "../../src/lib/kpi-estimates.js";

export const marginCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(windowedKpiSchema, ctx.params);
    await requireDirection(ctx, params.accessToken);

    const windowDays = params.windowDays ?? 30;
    const config = getKpiConfig();

    return withCache(
      ctx.service!,
      "calcul.finance.margin",
      { siteCode: params.siteCode ?? null, windowDays },
      async () => {
        const orders = await fetchOrdersInWindow(ctx, {
          siteCode: params.siteCode,
          windowDays,
          accessToken: params.accessToken
        });

        const totalRevenue = orders.reduce(
          (sum, order) => sum + estimateOrderRevenue(order),
          0
        );
        const estimatedCost = orders.reduce(
          (sum, order) => sum + estimateOrderCost(estimateOrderRevenue(order), config),
          0
        );
        const margin = totalRevenue - estimatedCost;

        return {
          siteCode: params.siteCode ?? null,
          windowDays,
          orderCount: orders.length,
          totalRevenue,
          estimatedCost,
          margin,
          targetMarginRate: config.targetMarginRate,
          costRatio: 1 - config.targetMarginRate
        };
      }
    );
  }
};

export const totalDelayCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(windowedKpiSchema, ctx.params);
    await requireDirection(ctx, params.accessToken);

    const windowDays = params.windowDays ?? 30;
    const config = getKpiConfig();
    const now = new Date();

    return withCache(
      ctx.service!,
      "calcul.finance.totalDelay",
      { siteCode: params.siteCode ?? null, windowDays },
      async () => {
        const orders = await fetchOrdersInWindow(ctx, {
          siteCode: params.siteCode,
          windowDays,
          accessToken: params.accessToken
        });

        const lateOrders = orders.filter(
          (order) => isActiveOrder(order.status) && countDaysLate(order, now) > 0
        );

        const penalties = lateOrders.map((order) => ({
          order,
          daysLate: countDaysLate(order, now),
          penalty: estimateDelayPenalty(order, now, config)
        }));

        const estimatedDelayCost = penalties.reduce((sum, row) => sum + row.penalty, 0);

        return {
          siteCode: params.siteCode ?? null,
          windowDays,
          totalDelays: lateOrders.length,
          estimatedDelayCost,
          penaltyConfig: {
            baseCentimes: config.delayPenaltyBaseCentimes,
            perDayCentimes: config.delayPenaltyPerDayCentimes,
            revenueRatio: config.delayPenaltyRevenueRatio
          },
          orders: penalties.map(({ order, daysLate, penalty }) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            dueDate: order.dueDate ?? null,
            promisedDeliveryDate: order.promisedDeliveryDate ?? null,
            daysLate,
            penalty
          }))
        };
      }
    );
  }
};

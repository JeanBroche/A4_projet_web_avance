import type { Context } from "moleculer";
import { parseParams, requireDirection } from "@aeronexis/services-shared";
import { windowedKpiSchema } from "../../src/lib/schemas.js";
import { callDownstream } from "../../src/lib/downstream.js";
import { withCache } from "../../src/lib/cache.js";

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  dueDate?: string | Date | null;
  createdAt: string | Date;
};

type OrderHistoryPage = {
  total: number;
  limit: number;
  offset: number;
  items: OrderSummary[];
};

// Coefficient cout / CA - donnees fictives coherentes en l'absence d'un module finance dedie.
const COST_RATIO = 0.65;

// Penalite forfaitaire par commande en retard (centimes).
const DELAY_PENALTY_CENTIMES = 5_000;

const ACTIVE_STATUSES = ["DRAFT", "VALIDATED", "IN_PRODUCTION", "SHIPPED"];

async function loadOrdersWindow(
  ctx: Context,
  siteCode: string | undefined,
  windowDays: number,
  accessToken: string | undefined
) {
  const page = await callDownstream<OrderHistoryPage>(
    ctx,
    "commande.order.history",
    {
      ...(siteCode ? { siteCode } : {}),
      limit: 500
    },
    accessToken
  );
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  return page.items.filter((o) => new Date(o.createdAt) >= windowStart);
}

export const marginCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(windowedKpiSchema, ctx.params);
    requireDirection(ctx, params.accessToken);

    const windowDays = params.windowDays ?? 30;
    return withCache(
      ctx.service!,
      "calcul.finance.margin",
      { siteCode: params.siteCode ?? null, windowDays },
      async () => {
        const orders = await loadOrdersWindow(
          ctx,
          params.siteCode,
          windowDays,
          params.accessToken
        );

        const totalRevenue = orders.reduce(
          (sum, o) => sum + (o.totalAmount || 0),
          0
        );
        const estimatedCost = Math.round(totalRevenue * COST_RATIO);
        const margin = totalRevenue - estimatedCost;

        return {
          siteCode: params.siteCode ?? null,
          windowDays,
          orderCount: orders.length,
          totalRevenue,
          estimatedCost,
          margin,
          costRatio: COST_RATIO
        };
      }
    );
  }
};

export const totalDelayCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(windowedKpiSchema, ctx.params);
    requireDirection(ctx, params.accessToken);

    const windowDays = params.windowDays ?? 30;
    return withCache(
      ctx.service!,
      "calcul.finance.totalDelay",
      { siteCode: params.siteCode ?? null, windowDays },
      async () => {
        const orders = await loadOrdersWindow(
          ctx,
          params.siteCode,
          windowDays,
          params.accessToken
        );

        const now = new Date();
        const lateOrders = orders.filter((order) => {
          if (!ACTIVE_STATUSES.includes(order.status)) {
            return false;
          }
          const due = order.dueDate ? new Date(order.dueDate) : null;
          return due !== null && due < now;
        });

        const totalDelays = lateOrders.length;
        const estimatedDelayCost = totalDelays * DELAY_PENALTY_CENTIMES;

        return {
          siteCode: params.siteCode ?? null,
          windowDays,
          totalDelays,
          estimatedDelayCost,
          penaltyPerOrder: DELAY_PENALTY_CENTIMES
        };
      }
    );
  }
};

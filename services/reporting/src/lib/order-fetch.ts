import type { Context } from "moleculer";
import { callDownstream } from "./downstream.js";
import { getKpiConfig } from "./kpi-config.js";

export type ReportingOrderLine = {
  quantity: number;
  unitPrice?: number | null;
  ofId?: string | null;
  productCode?: string;
};

export type ReportingOrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  isUrgent: boolean;
  totalAmount: number;
  dueDate?: string | Date | null;
  promisedDeliveryDate?: string | Date | null;
  createdAt: string | Date;
  client?: { name: string; code?: string };
  lines?: ReportingOrderLine[];
};

type OrderHistoryPage = {
  total: number;
  limit: number;
  offset: number;
  items: ReportingOrderSummary[];
};

export async function fetchOrdersInWindow(
  ctx: Context,
  params: {
    siteCode?: string;
    windowDays: number;
    accessToken?: string;
  }
): Promise<ReportingOrderSummary[]> {
  const config = getKpiConfig();
  const windowStart = new Date(Date.now() - params.windowDays * 24 * 60 * 60 * 1000);
  const collected: ReportingOrderSummary[] = [];
  let offset = 0;

  while (collected.length < config.maxOrdersFetched) {
    const page = await callDownstream<OrderHistoryPage>(
      ctx,
      "order.order.history",
      {
        ...(params.siteCode ? { siteCode: params.siteCode } : {}),
        limit: config.orderPageSize,
        offset
      },
      params.accessToken
    );

    if (page.items.length === 0) {
      break;
    }

    for (const order of page.items) {
      if (new Date(order.createdAt) >= windowStart) {
        collected.push(order);
      }
    }

    offset += page.items.length;
    if (offset >= page.total) {
      break;
    }
  }

  return collected;
}

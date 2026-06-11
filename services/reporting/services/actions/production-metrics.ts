import type { Context } from "moleculer";
import { parseParams, requireDirection } from "@aeronexis/services-shared";
import { baseKpiSchema } from "../../src/lib/schemas.js";
import { callDownstream } from "../../src/lib/downstream.js";
import { withCache } from "../../src/lib/cache.js";

type BatchRow = {
  batch_id: string;
  batch_code: string;
  status: string;
  progress: number;
  plannedEndAt: string | Date | null;
  plannedStartAt: string | Date | null;
};

type BatchListPage = {
  total: number;
  limit: number;
  offset: number;
  items: BatchRow[];
};

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED"];

async function loadActiveBatches(
  ctx: Context,
  siteCode: string | undefined,
  accessToken: string | undefined
): Promise<BatchRow[]> {
  const page = await callDownstream<BatchListPage>(
    ctx,
    "production.batch.list",
    {
      ...(siteCode ? { siteCode } : {}),
      limit: 500
    },
    accessToken
  );
  return page.items.filter((b) => !TERMINAL_STATUSES.includes(b.status));
}

export const avancementCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(baseKpiSchema, ctx.params);
    await requireDirection(ctx, params.accessToken);

    return withCache(
      ctx.service!,
      "calcul.production.avancement",
      { siteCode: params.siteCode ?? null },
      async () => {
        const batches = await loadActiveBatches(
          ctx,
          params.siteCode,
          params.accessToken
        );

        const totalActive = batches.length;
        const totalProgress = batches.reduce(
          (sum, b) => sum + (b.progress ?? 0),
          0
        );
        const averageProgress =
          totalActive > 0 ? Math.round(totalProgress / totalActive) : 0;

        return {
          siteCode: params.siteCode ?? null,
          totalActiveBatches: totalActive,
          averageProgress
        };
      }
    );
  }
};

export const retardLotsCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(baseKpiSchema, ctx.params);
    await requireDirection(ctx, params.accessToken);

    return withCache(
      ctx.service!,
      "calcul.production.retardLots",
      { siteCode: params.siteCode ?? null },
      async () => {
        const batches = await loadActiveBatches(
          ctx,
          params.siteCode,
          params.accessToken
        );
        const now = new Date();

        const lateBatches = batches.filter((b) => {
          if (!b.plannedEndAt) {
            return false;
          }
          return new Date(b.plannedEndAt) < now;
        });

        return {
          siteCode: params.siteCode ?? null,
          totalActiveBatches: batches.length,
          lateBatches: lateBatches.length,
          batches: lateBatches.map((b) => ({
            batch_id: b.batch_id,
            batch_code: b.batch_code,
            status: b.status,
            progress: b.progress,
            plannedEndAt: b.plannedEndAt
          }))
        };
      }
    );
  }
};

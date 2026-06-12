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
const BATCH_PAGE_SIZE = 100;
const MAX_BATCHES_FETCHED = 500;

async function loadAllBatches(
  ctx: Context,
  siteCode: string | undefined,
  accessToken: string | undefined
): Promise<BatchRow[]> {
  const collected: BatchRow[] = [];
  let offset = 0;

  while (collected.length < MAX_BATCHES_FETCHED) {
    const page = await callDownstream<BatchListPage>(
      ctx,
      "production.batch.list",
      {
        ...(siteCode ? { siteCode } : {}),
        limit: BATCH_PAGE_SIZE,
        offset
      },
      accessToken
    );

    if (page.items.length === 0) {
      break;
    }

    collected.push(...page.items);
    offset += page.items.length;
    if (offset >= page.total) {
      break;
    }
  }

  return collected;
}

function loadActiveBatches(batches: BatchRow[]): BatchRow[] {
  return batches.filter((b) => !TERMINAL_STATUSES.includes(b.status));
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
        const allBatches = await loadAllBatches(
          ctx,
          params.siteCode,
          params.accessToken
        );
        const batches = loadActiveBatches(allBatches);

        const totalActive = batches.length;
        const totalProgress = batches.reduce(
          (sum, b) => sum + (b.progress ?? 0),
          0
        );
        const averageProgress =
          totalActive > 0 ? Math.round(totalProgress / totalActive) : 0;

        const totalBatches = allBatches.length;
        const completedBatches = allBatches.filter(
          (b) => b.status === "COMPLETED"
        ).length;
        const yieldRate =
          totalBatches > 0
            ? Math.round((completedBatches / totalBatches) * 100)
            : 0;

        return {
          siteCode: params.siteCode ?? null,
          totalBatches,
          completedBatches,
          yieldRate,
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
        const batches = loadActiveBatches(
          await loadAllBatches(ctx, params.siteCode, params.accessToken)
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

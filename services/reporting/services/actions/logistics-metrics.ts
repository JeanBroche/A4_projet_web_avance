import type { Context } from "moleculer";
import { parseParams, requireDirection } from "@aeronexis/services-shared";
import { baseKpiSchema, windowedKpiSchema } from "../../src/lib/schemas.js";
import { callDownstream } from "../../src/lib/downstream.js";
import { withCache } from "../../src/lib/cache.js";

type AlertRow = {
  id: string;
  siteCode: string;
  materialId: string;
  resolvedAt: string | null;
};

type ForecastRow = {
  materialId: string;
  code: string;
  siteCode: string;
  available: number;
  minimum: number;
  consumptionPerDay: number;
  estimatedDaysToRupture: number | null;
  score: number;
};

export const ruptureStockCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(baseKpiSchema, ctx.params);
    requireDirection(ctx, params.accessToken);

    return withCache(
      ctx.service!,
      "calcul.logistique.rupture",
      { siteCode: params.siteCode ?? null },
      async () => {
        const alerts = await callDownstream<AlertRow[]>(
          ctx,
          "stock.alert.list",
          {
            ...(params.siteCode ? { siteCode: params.siteCode } : {}),
            includeResolved: false
          },
          params.accessToken
        );

        const totalRuptureProducts = alerts.length;
        return {
          siteCode: params.siteCode ?? null,
          totalRuptureProducts,
          materials: alerts.map((a) => a.materialId)
        };
      }
    );
  }
};

export const rotationStockCalculation = {
  async handler(ctx: Context) {
    const params = parseParams(windowedKpiSchema, ctx.params);
    requireDirection(ctx, params.accessToken);

    const windowDays = params.windowDays ?? 30;
    return withCache(
      ctx.service!,
      "calcul.logistique.rotation",
      { siteCode: params.siteCode ?? null, windowDays },
      async () => {
        const forecast = await callDownstream<ForecastRow[]>(
          ctx,
          "stock.forecast.rupture",
          {
            ...(params.siteCode ? { siteCode: params.siteCode } : {}),
            windowDays
          },
          params.accessToken
        );

        const totalConsumption = forecast.reduce(
          (sum, p) => sum + p.consumptionPerDay,
          0
        );
        const averageConsumptionPerDay =
          forecast.length > 0
            ? Math.round((totalConsumption / forecast.length) * 100) / 100
            : 0;

        const atRisk = forecast
          .filter((p) => p.score >= 70)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        return {
          siteCode: params.siteCode ?? null,
          windowDays,
          totalMaterials: forecast.length,
          averageConsumptionPerDay,
          atRiskMaterials: atRisk
        };
      }
    );
  }
};

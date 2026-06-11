import type { Context } from "moleculer";
import { resolveOfId } from "@aeronexis/shared";
import type { BomLineInput } from "./production-helpers.js";

type StockLevel = { materialId: string; code: string };

export async function reserveMaterialsForBatch(
  ctx: Context,
  params: {
    batchCode: string;
    orderNumber: string;
    siteCode: string;
    lines: BomLineInput[];
    accessToken?: string;
  }
) {
  const ofId = resolveOfId(params.batchCode, params.orderNumber);

  if (params.lines.length === 0) {
    ctx.service?.logger.warn("No BOM lines to reserve for batch", {
      batchCode: params.batchCode,
      siteCode: params.siteCode,
      ofId
    });
    return null;
  }

  const reservationLines: Array<{ materialId: string; qty: number }> = [];

  for (const line of params.lines) {
    const levels = await ctx.call<StockLevel[], Record<string, unknown>>("stock.level.list", {
      siteCode: params.siteCode,
      code: line.material_id,
      accessToken: params.accessToken
    });

    const material = levels[0];
    if (!material) {
      ctx.service?.logger.warn("BOM material not found in stock for reservation", {
        materialCode: line.material_id,
        siteCode: params.siteCode,
        ofId
      });
      continue;
    }

    reservationLines.push({ materialId: material.materialId, qty: line.quantity });
  }

  if (reservationLines.length === 0) {
    return null;
  }

  return ctx.call("stock.reservation.create", {
    ofId,
    siteCode: params.siteCode,
    lines: reservationLines,
    accessToken: params.accessToken
  });
}

export type ManuOrderFinishedPayload = {
  batch_code: string;
  command_id: string;
  siteCode: string;
  ofId: string;
};

export function buildManuOrderFinishedPayload(batch: {
  batch_code: string;
  command_id: string;
  siteCode: string;
}) {
  return {
    batch_code: batch.batch_code,
    command_id: batch.command_id,
    siteCode: batch.siteCode,
    ofId: resolveOfId(batch.batch_code, batch.command_id)
  } satisfies ManuOrderFinishedPayload;
}

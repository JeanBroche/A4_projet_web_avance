import type { Context } from "moleculer";
import { resolveOfId } from "@aeronexis/shared";

type BomLike = { material_id: string; quantity: number };

type StockLevel = { materialId: string; code: string };

export async function reserveMaterialsForBatch(
  ctx: Context,
  params: {
    batchCode: string;
    orderNumber: string;
    siteCode: string;
    bom: BomLike;
    accessToken?: string;
  }
) {
  const ofId = resolveOfId(params.batchCode, params.orderNumber);

  const levels = await ctx.call<StockLevel[], Record<string, unknown>>("stock.level.list", {
    siteCode: params.siteCode,
    code: params.bom.material_id,
    accessToken: params.accessToken
  });

  const material = levels[0];
  if (!material) {
    ctx.service?.logger.warn("BOM material not found in stock for reservation", {
      materialCode: params.bom.material_id,
      siteCode: params.siteCode,
      ofId
    });
    return null;
  }

  return ctx.call("stock.reservation.create", {
    ofId,
    lines: [{ materialId: material.materialId, qty: params.bom.quantity }],
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

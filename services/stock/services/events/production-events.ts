import type { Context, Service } from "moleculer";
import {
  PickListCompletedPayload,
  recordPickListStockOut,
  releaseReservationsByOfId
} from "../../src/lib/stock-integration.js";
import { publishStockEvent } from "../../src/lib/events.js";
import { DomainEvents } from "@aeronexis/shared";

type ManuOrderFinishedPayload = {
  batch_code?: string;
  command_id?: string;
  siteCode?: string;
  ofId?: string;
};

async function handleManuOrderFinished(
  this: Service,
  ctx: Context<ManuOrderFinishedPayload>
) {
  const p = ctx.params;
  const ofId = p.ofId;
  if (!ofId) return;

  try {
    const count = await releaseReservationsByOfId(ofId, p.siteCode);
    if (count > 0) {
      publishStockEvent(this, DomainEvents.stock.released, {
        ofId,
        siteCode: p.siteCode,
        count,
        reason: "OF_COMPLETED"
      });
      this.logger.info("Stock reservations released after OF completion", {
        ofId,
        siteCode: p.siteCode,
        count
      });
    }
  } catch (error) {
    this.logger.error("Failed to release reservations after OF completion", {
      ofId,
      siteCode: p.siteCode,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handlePickListCompleted(
  this: Service,
  ctx: Context<PickListCompletedPayload>
) {
  const p = ctx.params;
  if (!p.siteCode || !p.lines?.length) return;

  try {
    await recordPickListStockOut(p);
    this.logger.info("Stock consumption recorded from picklist", {
      pickListId: p.pickListId,
      siteCode: p.siteCode,
      lineCount: p.lines.length
    });
  } catch (error) {
    this.logger.error("Failed to record stock consumption from picklist", {
      pickListId: p.pickListId,
      siteCode: p.siteCode,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export const stockIntegrationEvents = {
  "production.manu_order.finished": {
    handler: handleManuOrderFinished
  },
  "shipment.picklist.completed": {
    handler: handlePickListCompleted
  }
};

import type { Context, Service } from "moleculer";
import { getDb } from "../../src/db.js";
import { appendEventHistory, upsertLotProgress } from "../../src/lib/lot-trace-writer.js";

type BatchEvent = {
  batch_code?: string;
  command_id?: string;
  siteCode?: string;
  status?: string;
  progress?: number;
};

type StockEvent = {
  ofId?: string;
  reservationIds?: string[];
  movementId?: string;
  type?: string;
  quantity?: number;
  count?: number;
  reason?: string;
};

type ShipmentEvent = {
  id?: string;
  code?: string;
  orderNumber?: string;
  ofId?: string | null;
  siteCode?: string;
  fromStatus?: string;
  toStatus?: string;
  pickListId?: string;
};

function correlationId(ctx: Context) {
  return (ctx.meta as { correlationId?: string }).correlationId;
}

async function handleBatchCreated(ctx: Context<BatchEvent>) {
  const p = ctx.params;
  if (!p.batch_code || !p.siteCode) return;

  const db = getDb();
  await upsertLotProgress(db, {
    batchCode: p.batch_code,
    orderNumber: p.command_id,
    siteCode: p.siteCode,
    status: p.status ?? "PENDING",
    correlationId: correlationId(ctx)
  });
  await appendEventHistory(db, {
    type: "production.batch.created",
    batchCode: p.batch_code,
    orderNumber: p.command_id,
    siteCode: p.siteCode,
    payload: { status: p.status ?? "PENDING" },
    correlationId: correlationId(ctx)
  });
}

async function handleBatchProgress(ctx: Context<BatchEvent>) {
  const p = ctx.params;
  if (!p.batch_code || !p.siteCode) return;

  const db = getDb();
  await upsertLotProgress(db, {
    batchCode: p.batch_code,
    orderNumber: p.command_id,
    siteCode: p.siteCode,
    status: p.status ?? "IN_PROGRESS",
    correlationId: correlationId(ctx)
  });
  await appendEventHistory(db, {
    type: "production.batch.progress",
    batchCode: p.batch_code,
    orderNumber: p.command_id,
    siteCode: p.siteCode,
    payload: { progress: p.progress, status: p.status },
    correlationId: correlationId(ctx)
  });
}

async function handleManuOrderFinished(ctx: Context<BatchEvent>) {
  const p = ctx.params;
  if (!p.batch_code || !p.siteCode) return;

  const db = getDb();
  await upsertLotProgress(db, {
    batchCode: p.batch_code,
    orderNumber: p.command_id,
    siteCode: p.siteCode,
    status: "COMPLETED",
    correlationId: correlationId(ctx)
  });
  await appendEventHistory(db, {
    type: "production.manu_order.finished",
    batchCode: p.batch_code,
    orderNumber: p.command_id,
    siteCode: p.siteCode,
    correlationId: correlationId(ctx)
  });
}

async function handleStockReserved(ctx: Context<StockEvent>) {
  if (!ctx.params.ofId) return;
  const db = getDb();
  await appendEventHistory(db, {
    type: "stock.reserved",
    ofId: ctx.params.ofId,
    payload: { reservationIds: ctx.params.reservationIds },
    correlationId: correlationId(ctx)
  });
}

async function handleStockMovement(ctx: Context<StockEvent>) {
  if (!ctx.params.ofId) return;
  const db = getDb();
  await appendEventHistory(db, {
    type: "stock.movement.recorded",
    ofId: ctx.params.ofId,
    payload: {
      movementId: ctx.params.movementId,
      movementType: ctx.params.type,
      quantity: ctx.params.quantity
    },
    correlationId: correlationId(ctx)
  });
}

async function handleStockReleased(ctx: Context<StockEvent>) {
  if (!ctx.params.ofId) return;
  const db = getDb();
  await appendEventHistory(db, {
    type: "stock.released",
    ofId: ctx.params.ofId,
    payload: { count: ctx.params.count, reason: ctx.params.reason },
    correlationId: correlationId(ctx)
  });
}

async function handleShipmentEvent(ctx: Context<ShipmentEvent>, type: string) {
  const p = ctx.params;
  if (!p.siteCode) return;

  const db = getDb();
  if (p.ofId) {
    await upsertLotProgress(db, {
      batchCode: p.ofId.startsWith("BATCH-") ? p.ofId : undefined,
      orderNumber: p.orderNumber,
      siteCode: p.siteCode,
      status: p.toStatus ?? p.fromStatus ?? "shipment",
      correlationId: correlationId(ctx)
    });
  }

  await appendEventHistory(db, {
    type,
    ofId: p.ofId ?? undefined,
    batchCode: p.ofId?.startsWith("BATCH-") ? p.ofId : undefined,
    orderNumber: p.orderNumber,
    siteCode: p.siteCode,
    payload: {
      shipmentId: p.id,
      code: p.code,
      orderNumber: p.orderNumber,
      fromStatus: p.fromStatus,
      toStatus: p.toStatus,
      pickListId: p.pickListId
    },
    correlationId: correlationId(ctx)
  });
}

async function handleBatchAnomaly(ctx: Context<BatchEvent & { anomaly_id?: string; anomaly_code?: string; description?: string }>) {
  const p = ctx.params;
  if (!p.batch_code || !p.siteCode) return;

  const db = getDb();
  await appendEventHistory(db, {
    type: "production.batch.anomaly_reported",
    batchCode: p.batch_code,
    orderNumber: p.command_id,
    siteCode: p.siteCode,
    payload: {
      anomaly_id: p.anomaly_id,
      anomaly_code: p.anomaly_code,
      description: p.description
    },
    correlationId: correlationId(ctx)
  });
}

export const lotTraceEvents = {
  "production.batch.created": {
    async handler(this: Service, ctx: Context<BatchEvent>) {
      await handleBatchCreated(ctx);
    }
  },
  "production.batch.progress": {
    async handler(this: Service, ctx: Context<BatchEvent>) {
      await handleBatchProgress(ctx);
    }
  },
  "production.batch.anomaly_reported": {
    async handler(this: Service, ctx: Context<BatchEvent>) {
      await handleBatchAnomaly(ctx);
    }
  },
  "production.manu_order.finished": {
    async handler(this: Service, ctx: Context<BatchEvent>) {
      await handleManuOrderFinished(ctx);
    }
  },
  "stock.reserved": {
    async handler(this: Service, ctx: Context<StockEvent>) {
      await handleStockReserved(ctx);
    }
  },
  "stock.movement.recorded": {
    async handler(this: Service, ctx: Context<StockEvent>) {
      await handleStockMovement(ctx);
    }
  },
  "stock.released": {
    async handler(this: Service, ctx: Context<StockEvent>) {
      await handleStockReleased(ctx);
    }
  },
  "shipment.planned": {
    async handler(this: Service, ctx: Context<ShipmentEvent>) {
      await handleShipmentEvent(ctx, "shipment.planned");
    }
  },
  "shipment.status.changed": {
    async handler(this: Service, ctx: Context<ShipmentEvent>) {
      await handleShipmentEvent(ctx, "shipment.status.changed");
    }
  },
  "shipment.picklist.completed": {
    async handler(this: Service, ctx: Context<ShipmentEvent>) {
      await handleShipmentEvent(ctx, "shipment.picklist.completed");
    }
  },
  "shipment.picklist.auto_created": {
    async handler(this: Service, ctx: Context<ShipmentEvent>) {
      await handleShipmentEvent(ctx, "shipment.picklist.auto_created");
    }
  }
};

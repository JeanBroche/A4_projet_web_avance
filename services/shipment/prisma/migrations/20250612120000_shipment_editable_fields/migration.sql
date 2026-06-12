ALTER TABLE "shipment"."shipments"
  ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "emoji" TEXT DEFAULT '🚚',
  ADD COLUMN IF NOT EXISTS "plannedDeliveryDate" DATE;

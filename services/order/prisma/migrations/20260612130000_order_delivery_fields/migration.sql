-- AlterTable
ALTER TABLE "order"."customer_orders" ADD COLUMN "carrier" TEXT;
ALTER TABLE "order"."customer_orders" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "order"."customer_orders" ADD COLUMN "emoji" TEXT DEFAULT '📦';

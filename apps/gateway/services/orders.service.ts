import type { ServiceSchema, Context } from "moleculer";

interface Order {
  id: string;
  produit: string;
  quantite: number;
  statut: "en_attente" | "validee" | "expediee";
  createdAt: Date;
}

// Données en mémoire pour l'exemple
const db = new Map<string, Order>();

const OrdersService: ServiceSchema = {
  name: "orders",

  actions: {
    list: {
      async handler(ctx: Context): Promise<Order[]> {
        return Array.from(db.values());
      },
    },

    get: {
      params: { id: "string" },
      async handler(ctx: Context<{ id: string }>): Promise<Order> {
        const order = db.get(ctx.params.id);
        if (!order) {
          throw Object.assign(
            new Error(`Order ${ctx.params.id} not found`),
            { code: 404, type: "NOT_FOUND" }
          );
        }
        return order;
      },
    },

    create: {
      params: {
        produit: "string",
        quantite: "number",
      },
      async handler(
        ctx: Context<{ produit: string; quantite: number }>
      ): Promise<Order> {
        const order: Order = {
          id: Date.now().toString(),
          produit: ctx.params.produit,
          quantite: ctx.params.quantite,
          statut: "en_attente",
          createdAt: new Date(),
        };
        db.set(order.id, order);

        ctx.emit("order.created", order);

        return order;
      },
    },

    update: {
      params: { id: "string" },
      async handler(
        ctx: Context<{ id: string; [key: string]: any }>
      ): Promise<Order> {
        const order = db.get(ctx.params.id);
        if (!order) {
          throw Object.assign(new Error("Order not found"), { code: 404 });
        }
        const updated = { ...order, ...ctx.params };
        db.set(ctx.params.id, updated);
        return updated;
      },
    },

    remove: {
      params: { id: "string" },
      async handler(ctx: Context<{ id: string }>): Promise<{ deleted: boolean }> {
        db.delete(ctx.params.id);
        return { deleted: true };
      },
    },
  },

  events: {
    "stock.rupture"(ctx: Context<{ produitId: string }>): void {
      this.logger.warn(
        `Order ${ctx.params.produitId} is out of stock`
      );
    },
  },
};

export default OrdersService;
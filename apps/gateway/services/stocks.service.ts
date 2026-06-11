import type { ServiceSchema, Context } from "moleculer";

interface Stock {
  id: string;
  produit: string;
  quantite: number;
  seuilAlerte: number;
}

const db = new Map<string, Stock>();

const StocksService: ServiceSchema = {
  name: "stocks",

  actions: {
    list: {
      async handler(): Promise<Stock[]> {
        return Array.from(db.values());
      },
    },

    get: {
      params: { id: "string" },
      async handler(ctx: Context<{ id: string }>): Promise<Stock> {
        const stock = db.get(ctx.params.id);
        if (!stock) {
          throw Object.assign(new Error("Stock introuvable"), { code: 404 });
        }
        return stock;
      },
    },

    create: {
      params: {
        produit: "string",
        quantite: "number",
        seuilAlerte: { type: "number", optional: true, default: 10 },
      },
      async handler(ctx: Context<Omit<Stock, "id">>): Promise<Stock> {
        const stock: Stock = { id: Date.now().toString(), ...ctx.params };
        db.set(stock.id, stock);
        return stock;
      },
    },

    update: {
      params: { id: "string" },
      async handler(ctx: Context<Partial<Stock> & { id: string }>): Promise<Stock> {
        const stock = db.get(ctx.params.id);
        if (!stock) {
          throw Object.assign(new Error("Stock introuvable"), { code: 404 });
        }
        const updated = { ...stock, ...ctx.params };
        db.set(ctx.params.id, updated);
        return updated;
      },
    },

    // Action métier custom : ajuster la quantité
    ajuster: {
      params: {
        id: "string",
        delta: "number", // positif = entrée, négatif = sortie
      },
      async handler(
        ctx: Context<{ id: string; delta: number }>
      ): Promise<Stock> {
        const stock = db.get(ctx.params.id);
        if (!stock) {
          throw Object.assign(new Error("Stock introuvable"), { code: 404 });
        }

        stock.quantite += ctx.params.delta;

        if (stock.quantite < stock.seuilAlerte) {
          ctx.emit("stock.rupture", { produitId: stock.id, quantite: stock.quantite });
        }

        db.set(stock.id, stock);
        return stock;
      },
    },
  },
};

export default StocksService;
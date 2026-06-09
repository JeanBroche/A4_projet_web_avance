const { Context } = require("moleculer");

interface Product {
    name: string;
    dailyRate: number;
}

export async function ruptureStockCalculation(ctx: typeof Context) {
  const products = await ctx.call("stock.forecast.rupture") as Product[];
  const totalRuptureProducts = products.length;
  return { totalRuptureProducts };
}

export async function rotationStockCalculation(ctx: typeof Context) {
  const products = await ctx.call("stock.forecast.rupture") as Product[];

  const enrichedProducts = products.map(p => ({
    ...p,
    dailyRate: p.dailyRate
  }));

  return {
    products: enrichedProducts
  };
}
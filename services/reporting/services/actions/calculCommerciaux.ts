const { Context } = require("moleculer");

export async function urgentOrdersCalculation(ctx: typeof Context) {
  const orders = await ctx.call("commande.order.listUrgent");
  const totalUrgentOrders = orders.length;
  return { totalUrgentOrders };
}

export async function delayRiskOrdersCalculation(ctx: typeof Context) {
  const orders = await ctx.call("commande.order.delayRisk");
  const totalDelayRiskOrders = orders.length;
  return { totalDelayRiskOrders };
}

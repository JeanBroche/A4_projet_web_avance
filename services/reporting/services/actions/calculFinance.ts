const { Context } = require("moleculer");


// NE PAS OUBLIER DE CREER LES ACTIONS DANS LE SERVICE COMMANDE :  "order.listTotal" => Liste des commandes des 30 derniers jour par ex
// "batch.listTotal" => LISTE DES COUTS DES BATCHS CREES DANS LES 30 DERNIERS JOURS PAR EX

export async function marginCalculation(ctx: typeof Context) {
    const sales = await ctx.call("order.listTotal") as { amount: number }[];
    const costs = await ctx.call("batch.listTotal") as { cost: number }[];

    const totalSales = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const totalCosts = costs.reduce((sum, cost) => sum + cost.cost, 0);
    const margin = totalSales - totalCosts;
    return { margin };
}

// NE PAS OUBLIER DE CREER LES ACTIONS DANS LE SERVICE COMMANDE : "order.delayTotal" => Liste des commandes des 30 derniers jour par ex
export async function totalDelayCalculation(ctx: typeof Context) {
    const orders = await ctx.call("order.delayTotal") as { delay: number }[];
    const totalDelays = orders.length;
    return { totalDelays };
}

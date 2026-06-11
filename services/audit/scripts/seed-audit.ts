import { connectMongo, disconnectMongo, ensureIndexes, getDb } from "../src/db.js";
import { seedDemoScenario } from "../src/lib/audit-helpers.js";

async function main() {
  const db = await connectMongo();
  await ensureIndexes(db);
  await seedDemoScenario(db);
  console.log("Audit seed completed: demo scenario (logs, critical events, trace)");
  await disconnectMongo();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectMongo().catch(() => {});
  process.exit(1);
});

import { connectMongo, disconnectMongo, ensureIndexes, getDb } from "../src/db.js";
import { seedDemoLot } from "../src/lib/audit-helpers.js";

async function main() {
  const db = await connectMongo();
  await ensureIndexes(db);
  await seedDemoLot(db);
  console.log("Audit seed completed: LOT-2026-00001");
  await disconnectMongo();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectMongo().catch(() => {});
  process.exit(1);
});

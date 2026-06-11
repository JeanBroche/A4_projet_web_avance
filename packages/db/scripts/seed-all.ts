import { platform } from "node:os";
import { setTimeout } from "node:timers/promises";
import { SEED_SERVICES } from "./services.js";
import { runPnpmScript } from "./run-pnpm.js";

const SEED_GAP_MS = platform() === "win32" ? 1500 : 0;

async function main() {
  for (const service of SEED_SERVICES) {
    console.log(`\n>> db:seed (${service})`);
    await runPnpmScript(service, "db:seed");
    if (SEED_GAP_MS > 0) {
      await setTimeout(SEED_GAP_MS);
    }
  }
  console.log("\nAll seeds completed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { PRISMA_SERVICES } from "./services.js";
import { runPnpmScript } from "./run-pnpm.js";

for (const service of PRISMA_SERVICES) {
  console.log(`\n>> db:seed (${service})`);
  runPnpmScript(service, "db:seed");
}

console.log("\nAll seeds completed.");

import { PRISMA_SERVICES } from "./services.js";
import { runPnpmScript } from "./run-pnpm.js";

async function main() {
  for (const service of PRISMA_SERVICES) {
    console.log(`\n>> db:generate (${service})`);
    await runPnpmScript(service, "db:generate");
  }
  console.log("\nAll Prisma clients generated.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

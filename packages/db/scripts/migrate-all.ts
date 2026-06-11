import { PRISMA_SERVICES } from "./services.js";
import { runPnpmScript } from "./run-pnpm.js";

type MigrateCommand = "deploy" | "dev";

const command = (process.argv[2] ?? "deploy") as MigrateCommand;
const script = command === "dev" ? "db:migrate:dev" : "db:migrate";

async function main() {
  for (const service of PRISMA_SERVICES) {
    console.log(`\n>> ${script} (${service})`);
    await runPnpmScript(service, script);
  }
  console.log("\nAll migrations applied.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

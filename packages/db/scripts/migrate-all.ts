import { PRISMA_SERVICES } from "./services.js";
import { runPnpmScript } from "./run-pnpm.js";

type MigrateCommand = "deploy" | "dev";

const command = (process.argv[2] ?? "deploy") as MigrateCommand;
const script = command === "dev" ? "db:migrate:dev" : "db:migrate";

for (const service of PRISMA_SERVICES) {
  console.log(`\n>> ${script} (${service})`);
  runPnpmScript(service, script);
}

console.log("\nAll migrations applied.");

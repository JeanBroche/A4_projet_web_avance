import { spawnSync } from "node:child_process";
import { PRISMA_SERVICES } from "./services.mjs";

for (const service of PRISMA_SERVICES) {
  console.log(`\n>> prisma db seed (${service})`);
  const result = spawnSync(
    "pnpm",
    ["--filter", service, "exec", "prisma", "db", "seed"],
    { stdio: "inherit", shell: true }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll seeds completed.");

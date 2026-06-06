import { spawnSync } from "node:child_process";
import { PRISMA_SERVICES } from "./services.mjs";

const command = process.argv[2] ?? "deploy";
const prismaCommand = command === "dev" ? "migrate dev" : "migrate deploy";

for (const service of PRISMA_SERVICES) {
  console.log(`\n>> prisma ${prismaCommand} (${service})`);
  const result = spawnSync(
    "pnpm",
    ["--filter", service, "exec", "prisma", ...prismaCommand.split(" ")],
    { stdio: "inherit", shell: true }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll migrations applied.");

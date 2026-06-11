import { spawnSync } from "node:child_process";
import type { SeedService } from "./services.js";

export function runPnpmScript(service: SeedService, script: string): void {
  const result = spawnSync("pnpm", ["--filter", service, "run", script], {
    stdio: "inherit",
    shell: true
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

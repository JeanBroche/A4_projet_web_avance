import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { setTimeout } from "node:timers/promises";
import type { SeedService } from "./services.js";

/** Windows native crash / OOM (STATUS_STACK_BUFFER_OVERRUN or VirtualAlloc failure). */
const WIN_NATIVE_CRASH = 3221226505;

export async function runPnpmScript(service: SeedService, script: string): Promise<void> {
  const maxAttempts = platform() === "win32" ? 3 : 1;
  const retryDelayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = spawnSync("pnpm", ["--filter", service, "run", script], {
      stdio: "inherit",
      shell: true
    });

    if (result.status === 0) {
      return;
    }

    if (attempt < maxAttempts && result.status === WIN_NATIVE_CRASH) {
      console.warn(
        `\n>> ${service} exited with ${result.status} (likely OOM), retry ${attempt + 1}/${maxAttempts}...`
      );
      await setTimeout(retryDelayMs * attempt);
      continue;
    }

    process.exit(result.status ?? 1);
  }
}

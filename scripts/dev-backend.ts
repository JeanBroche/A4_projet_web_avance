import { spawn, type ChildProcess } from "node:child_process";
import { platform } from "node:os";

const BACKEND_SERVICES = [
  "@aeronexis/auth",
  "@aeronexis/stock",
  "@aeronexis/order",
  "@aeronexis/production",
  "@aeronexis/shipment",
  "@aeronexis/reporting",
  "@aeronexis/audit",
  "@aeronexis/notification",
  "@aeronexis/gateway"
] as const;

const isWin = platform() === "win32";
const BATCH_SIZE = isWin ? 2 : 5;
const BATCH_DELAY_MS = isWin ? 4000 : 1500;

const children: ChildProcess[] = [];

function start(pkg: string) {
  console.log(`\n>> dev ${pkg}`);
  const child = spawn("pnpm", ["--filter", pkg, "run", "dev"], {
    stdio: "inherit",
    shell: true,
    env: process.env
  });
  children.push(child);
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
}

async function main() {
  if (isWin) {
    console.log(
      "Starting backend in small batches (reduces memory spikes on Windows).",
      "Use pnpm dev:backend:parallel for all-at-once startup."
    );
  }

  for (let i = 0; i < BACKEND_SERVICES.length; i += BATCH_SIZE) {
    for (const pkg of BACKEND_SERVICES.slice(i, i + BATCH_SIZE)) {
      start(pkg);
    }
    if (i + BATCH_SIZE < BACKEND_SERVICES.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  shutdown();
  process.exit(1);
});

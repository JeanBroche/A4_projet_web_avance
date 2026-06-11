import { spawn, type ChildProcess } from "node:child_process";
import { platform } from "node:os";

const MICROSERVICES = [
  "@aeronexis/auth",
  "@aeronexis/stock",
  "@aeronexis/order",
  "@aeronexis/production",
  "@aeronexis/shipment",
  "@aeronexis/reporting",
  "@aeronexis/audit",
  "@aeronexis/notification"
] as const;

const GATEWAY = "@aeronexis/gateway";

const isWin = platform() === "win32";
const BATCH_SIZE = isWin ? 2 : 5;
const BATCH_DELAY_MS = isWin ? 4000 : 1500;
const GATEWAY_DELAY_MS = isWin ? 3000 : 1500;

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

async function startInBatches(packages: readonly string[]) {
  for (let i = 0; i < packages.length; i += BATCH_SIZE) {
    for (const pkg of packages.slice(i, i + BATCH_SIZE)) {
      start(pkg);
    }
    if (i + BATCH_SIZE < packages.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
}

async function main() {
  console.log(
    "Starting backend: 8 microservices + gateway (HTTP :4000).",
    isWin
      ? "Batched startup on Windows — use pnpm dev:backend:parallel for all-at-once."
      : ""
  );

  await startInBatches(MICROSERVICES);
  await new Promise((resolve) => setTimeout(resolve, GATEWAY_DELAY_MS));
  start(GATEWAY);
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

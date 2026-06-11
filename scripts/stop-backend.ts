import { execSync } from "node:child_process";
import { platform } from "node:os";

function stopOnWindows() {
  const output = execSync(
    `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name='node.exe'\\" | Where-Object { $_.CommandLine -match 'moleculer-runner|dev-backend|@aeronexis' } | ForEach-Object { $_.ProcessId }"`,
    { encoding: "utf8" }
  ).trim();

  if (!output) {
    console.log("No backend processes found.");
    return;
  }

  for (const pid of output.split(/\s+/).filter(Boolean)) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Stopped PID ${pid}`);
    } catch {
      // process may already be gone
    }
  }
}

function stopOnUnix() {
  execSync(
    "pkill -f 'moleculer-runner|dev-backend' || true",
    { stdio: "inherit", shell: true }
  );
}

if (platform() === "win32") {
  stopOnWindows();
} else {
  stopOnUnix();
}

console.log("Backend stopped.");

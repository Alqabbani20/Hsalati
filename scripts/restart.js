// Restart dev server — kills anything on PORT (default 3000) then starts fresh
const { execSync, spawn } = require("child_process");
const port = process.env.PORT || "3000";
process.env.PORT = port;

function killPort(p) {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr ":${p}"`, { encoding: "utf8" });
      const pids = new Set();
      out.split("\n").forEach((line) => {
        const m = line.match(/LISTENING\s+(\d+)/);
        if (m) pids.add(m[1]);
      });
      pids.forEach((pid) => {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`Stopped process ${pid} on port ${p}`);
        } catch { /* already gone */ }
      });
    } else {
      execSync(`lsof -ti:${p} | xargs kill -9 2>/dev/null`, { stdio: "ignore", shell: true });
    }
  } catch { /* nothing listening */ }
}

killPort(port);
console.log(`Starting حصالتي on http://localhost:${port} ...`);
const child = spawn("node", ["server.js"], { stdio: "inherit", env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));

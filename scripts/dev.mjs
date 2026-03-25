/**
 * dev.mjs — starts Next.js on the first available port starting from BASE_PORT.
 * Also clears any stale .next/dev/lock before starting.
 * Usage: node scripts/dev.mjs
 */
import { createServer } from "net";
import { spawn } from "child_process";
import { rmSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_PORT = 8090;
const NEXT_BIN = "node_modules/next/dist/bin/next";
const LOCK_FILE = resolve(".next/dev/lock");

// ── Clear stale lock ──────────────────────────────────────────────────────────
if (existsSync(LOCK_FILE)) {
  rmSync(LOCK_FILE, { force: true });
  console.log("🔓 Cleared stale .next/dev/lock");
}

// ── Find free port ────────────────────────────────────────────────────────────
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "0.0.0.0");
  });
}

async function findPort(start) {
  let port = start;
  while (!(await isPortFree(port))) {
    console.log(`⚠  Port ${port} is in use, trying ${port + 1}…`);
    port++;
  }
  return port;
}

// ── Start Next.js ─────────────────────────────────────────────────────────────
const port = await findPort(BASE_PORT);
console.log(`▶  Starting Bugeti on http://localhost:${port}`);

const proc = spawn(
  "node",
  [NEXT_BIN, "dev", "--webpack", "--port", String(port)],
  { stdio: "inherit" }
);

proc.on("exit", (code) => process.exit(code ?? 0));

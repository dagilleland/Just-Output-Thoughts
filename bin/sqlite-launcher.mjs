#!/usr/bin/env node
// bin/sqlite-launcher.mjs
// Generic launcher: ensures Node's built-in SQLite is usable, then runs your real CLI entry.
// Reuse anywhere. Point to the built entry via SQLITE_LAUNCH_TARGET or adjust RELATIVE_TARGET.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// 1) How to find your *built* CLI entry:
//    - Preferred: set env var SQLITE_LAUNCH_TARGET to an absolute or relative path (from this file).
//    - Fallback: tweak RELATIVE_TARGET to your build output (e.g., "../dist/cli.js")
const RELATIVE_TARGET = "../dist/cli.js";
const targetPath = process.env.SQLITE_LAUNCH_TARGET
  ? resolve(__dirname, process.env.SQLITE_LAUNCH_TARGET)
  : resolve(__dirname, RELATIVE_TARGET);

// 2) Check whether sqlite is already usable
const require = createRequire(import.meta.url);
const hasFlag =
  process.execArgv.includes("--experimental-sqlite") ||
  (process.env.NODE_OPTIONS || "").includes("--experimental-sqlite");

let sqliteUsable = false;
try {
  require("node:sqlite"); // throws if not available / flag missing
  sqliteUsable = true;
} catch { /* not usable yet */ }

// 3) If not usable, re-exec current Node with the flag, chaining your real entry + args
if (!hasFlag && !sqliteUsable) {
  const args = ["--experimental-sqlite", targetPath, ...process.argv.slice(2)];
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  process.exit(r.status ?? (r.error ? 1 : 0));
}

// 4) Run the real entry (no re-exec needed)
const url = pathToFileURL(targetPath).toString();
await import(url);

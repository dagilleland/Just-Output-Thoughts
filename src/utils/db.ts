// src/utils/db.ts
// db.ts (ESM, TypeScript)
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import envPaths from "env-paths";
import { createRequire } from "node:module";

// Types only — these don't get bundled at runtime
import type { DatabaseSyncOptions } from "node:sqlite";
type DatabaseSyncCtor = new (file: string, opts?: DatabaseSyncOptions) => {
  exec(sql: string): void;
  close(): void;
  prepare<T = any>(sql: string): {
    run(...args: any[]): { changes?: number };
    all(...args: any[]): T[];
    get(...args: any[]): T | undefined;
  };
};

const require = createRequire(import.meta.url);
// Runtime load avoids Vite rewriting "node:sqlite" → "sqlite"
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: DatabaseSyncCtor };

export function openUserDb(
  appName: string,
  opts: DatabaseSyncOptions = {},
  fileName = `${appName}.db`,
  overrideDir?: string
) {
  const envVar = `${appName.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()}_DATA_DIR`;
  const envOverride = process.env[envVar];

  const dataDir = overrideDir ?? envOverride ?? envPaths(appName, { suffix: "" }).data;
  mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, fileName);
  const db = new DatabaseSync(dbPath, opts);
  return db;
}

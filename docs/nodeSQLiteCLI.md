# Smoke Test Re-Usable Code

To "smoke test" a new CLI that would include the [Node SQLite re-usable code](nodeSQLiteSupport.md), here is a `cli.ts` that you can use as a stand-alone check that your configuration is correct.

```ts
// src/cli.ts (ESM, TypeScript)
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import envPaths from "env-paths";

// ---- config you might reuse across CLIs ----
const APP_NAME = "my-cli";              // used for env-paths + DB filename
const DB_FILE  = `${APP_NAME}.db`;      // keep simple and predictable

// Load DatabaseSync via createRequire (tooling-safe, Node-native only)
const require = createRequire(import.meta.url);
type DatabaseSyncOptions = { readOnly?: boolean };
type Statement<T=any> = {
  run(...a: any[]): { changes?: number };
  all(...a: any[]): T[];
  get(...a: any[]): T | undefined;
};
type DatabaseSync = new (file: string, opts?: DatabaseSyncOptions) => {
  exec(sql: string): void;
  prepare<T=any>(sql: string): Statement<T>;
  close(): void;
};
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: DatabaseSync };

// Resolve per-user data dir and DB path
const dataDir = process.env[`${APP_NAME.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()}_DATA_DIR`]
  ?? envPaths(APP_NAME, { suffix: "" }).data;

mkdirSync(dataDir, { recursive: true });
const dbPath = join(dataDir, DB_FILE);

// --- sanity: open DB, do tiny R/W, print path ---
const db = new DatabaseSync(dbPath);
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      k TEXT PRIMARY KEY,
      v TEXT
    ) STRICT;
  `);
  db.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v")
    .run("hello", "world");

  const row = db.prepare<{ v: string }>("SELECT v FROM kv WHERE k = ?").get("hello");
  const value = row?.v ?? "(missing)";
  console.log(`[my-cli] SQLite OK at: ${dbPath}`);
  console.log(`[my-cli] hello → ${value}`);
} finally {
  db.close();
}
```

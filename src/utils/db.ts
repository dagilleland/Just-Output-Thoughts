// src/utils/db.ts
// Node-native SQLite helper for per-user data storage.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import envPaths from "env-paths";
import { createRequire } from "node:module";

// ─────────────────────────────────────────────────────────────────────────────
// Type aliases for the subset of the node:sqlite API we use here
// ─────────────────────────────────────────────────────────────────────────────

import type { DatabaseSyncOptions } from "node:sqlite";

/**
 * Minimal shape of the synchronous Database constructor exposed by `node:sqlite`.
 * The generic parameter `T` on the statements allows the type of result rows to
 * be inferred for `.all()` and `.get()` calls.
 */
type DatabaseSyncCtor = new (file: string, opts?: DatabaseSyncOptions) => {
  /** Execute one or more SQL statements that don't return rows. */
  exec(sql: string): void;

  /** Close the database connection. */
  close(): void;

  /**
   * Prepare a SQL statement for later execution.
   * @typeParam T - expected row type for `.all()`/`.get()`.
   */
  prepare<T = any>(sql: string): {
    /** Execute an INSERT/UPDATE/DELETE and return the change count (if any). */
    run(...args: any[]): { changes?: number; lastInsertRowid?: number };
    /** Execute a SELECT and return all rows. */
    all(...args: any[]): T[];
    /** Execute a SELECT and return the first row (or `undefined`). */
    get(...args: any[]): T | undefined;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Runtime import (avoids Vite/Vitest transforming "node:sqlite" → "sqlite")
// ─────────────────────────────────────────────────────────────────────────────

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: DatabaseSyncCtor };

/**
 * Open (or create) a per-user SQLite database file for this application.
 *
 * - Determines an OS-appropriate directory using `env-paths`.
 * - Ensures that directory exists.
 * - Opens the database via Node’s built-in `node:sqlite` module.
 * - Returns the live {@link DatabaseSync} instance.
 *
 * Typical use:
 * ```ts
 * const db = openUserDb("my-cli");
 * db.exec("CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, text TEXT)");
 * ```
 *
 * @param appName       Used to derive the data directory and default DB filename.
 *                      Example: `"my-cli"` → `~/.local/share/my-cli/my-cli.db` (Linux)
 * @param opts          Optional options forwarded to the `DatabaseSync` constructor.
 * @param fileName      Optional database filename (defaults to `${appName}.db`).
 * @param overrideDir   Optional absolute directory to store the database in.
 *                      Takes precedence over both `env-paths` and the environment
 *                      variable `${APPNAME}_DATA_DIR`.
 * @returns             An open synchronous database handle.
 */
export function openUserDb(
  appName: string,
  opts: DatabaseSyncOptions = {},
  fileName = `${appName}.db`,
  overrideDir?: string
) {
  // Environment variable override (e.g., MY_CLI_DATA_DIR)
  const envVar = `${appName.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()}_DATA_DIR`;
  const envOverride = process.env[envVar];

  // Determine base directory for persistent data
  const dataDir = overrideDir ?? envOverride ?? envPaths(appName, { suffix: "" }).data;
  mkdirSync(dataDir, { recursive: true });

  // Construct full database path and open it
  const dbPath = join(dataDir, fileName);
  const db = new DatabaseSync(dbPath, opts);
  return db;
}

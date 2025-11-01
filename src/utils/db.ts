// db.ts (ESM, TypeScript)
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import envPaths from "env-paths";
import { DatabaseSync, type DatabaseSyncOptions } from "node:sqlite";

/**
 * Open (or create) a file-backed SQLite DB in the user's OS-appropriate data dir.
 *
 * @param appName  Used to compute the data dir (e.g., ~/.local/share/<appName> or %APPDATA%\<appName>)
 * @param opts     node:sqlite options (e.g., { readOnly: false })
 * @param fileName Optional DB filename (default: <appName>.db)
 * @param overrideDir Optional absolute directory to use instead of env-paths
 *                    (also honored via env var: <APPNAME>_DATA_DIR)
 */
export function openUserDb(
  appName: string,
  opts: DatabaseSyncOptions = {},
  fileName = `${appName}.db`,
  overrideDir?: string
) {
  // Allow env override: e.g., MY_CLI_DATA_DIR=/custom/path
  const envOverride = process.env[`${appName.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()}_DATA_DIR`];

  // Compute the per-user data directory via env-paths
  const dataDir = overrideDir ?? envOverride ?? envPaths(appName, { suffix: "" }).data;
  mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, fileName);

  // DatabaseSync is synchronous; enables FK constraints by default in recent Node. :contentReference[oaicite:1]{index=1}
  const db = new DatabaseSync(dbPath, opts);

  // If you want to be explicit (harmless if already true):
  // db.exec("PRAGMA foreign_keys=ON;");

  return db;
}

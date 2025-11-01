// db.test.ts
import { createRequire } from "node:module";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Adjust the import path to wherever your helper lives:
import { openUserDb } from "../../src/utils/db.js";

// --- Only run these tests if Node's built-in sqlite is present (Node ≥ 22.5) ---
let hasNodeSqlite = true;
try {
  const require = createRequire(import.meta.url);
  require("node:sqlite"); // will throw if flag not set / not available
} catch {
  hasNodeSqlite = false;
}

// Use a name that exercises your env-var normalization logic (hyphen → underscore)
const APP_NAME = "test-cli";
const ENV_VAR = "TEST_CLI_DATA_DIR";

let tempDir = "";
let dbFile = "";

describe.runIf(hasNodeSqlite)("openUserDb (node:sqlite + env-paths)", () => {
  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), "test-cli-"));
    process.env[ENV_VAR] = tempDir; // override the per-user data dir
    dbFile = join(tempDir, `${APP_NAME}.db`);
  });

  afterAll(() => {
    // Cleanup temp files/dir
    delete process.env[ENV_VAR];
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates/opens a DB at the env-overridden path and can R/W", () => {
    const db = openUserDb(APP_NAME); // uses TEST_CLI_DATA_DIR
    try {
      // File exists?
      expect(existsSync(dbFile)).toBe(true);

      // R/W smoke test
      db.exec(`
        CREATE TABLE IF NOT EXISTS kv (
          k TEXT PRIMARY KEY,
          v TEXT
        ) STRICT
      `);

      const put = db.prepare(
        "INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v"
      );
      put.run("hello", "world");

      const rows = db.prepare("SELECT v FROM kv WHERE k = ?").all("hello");
      expect(rows.length).toBe(1);
      expect(rows[0].v).toBe("world");
    } finally {
      // Important: close the DB so Windows can remove the file/folder cleanly
      db.close();
    }
  });

  it("respects explicit overrideDir argument even if the env var is set", () => {
    const otherDir = mkdtempSync(join(tmpdir(), "test-cli-alt-"));
    const otherFile = join(otherDir, `${APP_NAME}.db`);

    const db = openUserDb(APP_NAME, {}, `${APP_NAME}.db`, otherDir);
    try {
      expect(existsSync(otherFile)).toBe(true);
      db.exec("PRAGMA user_version = 1;");
      const { user_version } = db.prepare("PRAGMA user_version;").get() ?? {};
      expect(user_version).toBe(1);
    } finally {
      db.close();
      rmSync(otherDir, { recursive: true, force: true });
    }
  });
});

// If node:sqlite isn't available, provide a helpful skip note.
describe.runIf(!hasNodeSqlite)("openUserDb (skipped)", () => {
  it("skips other openUserDb tests because node:sqlite is unavailable (need Node ≥ 22.5)", () => {
    expect(true).toBe(true);
  });
});

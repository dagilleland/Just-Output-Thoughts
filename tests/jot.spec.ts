// tests/jot.spec.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb, addThought, listThoughts, softDelete, closeDb, type DB } from "../src/jotRepo.js";

function tempDir(prefix = "jot-test-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

let DIR: string;
let db: DB | undefined;

beforeEach(() => {
  DIR = tempDir();
  db = undefined; // created per test
});

afterEach(() => {
  if (db) closeDb(db);
  // now that the DB file handle is released, we can safely delete the temp dir
  if (DIR) rmSync(DIR, { recursive: true, force: true });
});

describe("jot core flows", () => {
  it("adds and lists thoughts (default limit)", () => {
    db = getDb(DIR);
    const id1 = addThought(db, "first");
    const id2 = addThought(db, "second");
    expect(id1).toBeGreaterThan(0);
    expect(id2).toBeGreaterThan(id1);

    const rows = listThoughts(db); // default 7
    expect(rows.length).toBe(2);
    expect(rows[0].text).toBe("second");
    expect(rows[1].text).toBe("first");
  });

  it("soft-deletes a thought", () => {
    db = getDb(DIR);
    const id = addThought(db, "to delete");
    const ok = softDelete(db, id);
    expect(ok).toBe(true);

    const rows = listThoughts(db);
    expect(rows.find((r) => r.id === id)).toBeUndefined();
  });

  it("list unlimited with -1", () => {
    db = getDb(DIR);
    for (let i = 0; i < 12; i++) addThought(db, `t-${i}`);
    const rows = listThoughts(db, -1);
    expect(rows.length).toBe(12);
  });
});

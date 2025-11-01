// src/jotRepo.ts
import { openUserDb } from "./utils/db.js";

const APP = "jot";

// Use the concrete return type of openUserDb to avoid importing node:sqlite types.
type DB = ReturnType<typeof openUserDb>;

function ensureSchema(db: DB) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS thoughts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_thoughts_created_at ON thoughts (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_thoughts_deleted_at ON thoughts (deleted_at);
  `);
}

export type Thought = {
  id: number;
  text: string;
  created_at: string;
  deleted_at: string | null;
};

export function getDb(overrideDir?: string): DB {
  const db = openUserDb(APP, {}, `${APP}.db`, overrideDir);
  ensureSchema(db);
  return db;
}

export function addThought(db: DB, text: string): number {
  const stmt = db.prepare("INSERT INTO thoughts (text) VALUES (?)");
  const info = stmt.run(text);
  return Number(info.lastInsertRowid ?? 0);
}

export function listThoughts(db: DB, limit = 7): Thought[] {
  const stmt =
    limit < 0
      ? db.prepare("SELECT id, text, created_at, deleted_at FROM thoughts WHERE deleted_at IS NULL ORDER BY created_at DESC")
      : db.prepare("SELECT id, text, created_at, deleted_at FROM thoughts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?");
  const rows = limit < 0 ? stmt.all() : stmt.all(limit);
  return rows as Thought[];
}

export function softDelete(db: DB, id: number): boolean {
  const stmt = db.prepare(
    "UPDATE thoughts SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND deleted_at IS NULL"
  );
  const info = stmt.run(id);
  return (info.changes ?? 0) > 0;
}

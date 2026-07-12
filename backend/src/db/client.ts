import { Database } from "bun:sqlite";

// Single shared connection for the whole app.
// bun:sqlite is synchronous and fast enough that a single connection
// is fine for a hackathon-scale app — no pooling needed.

const DB_PATH = Bun.env.DB_PATH ?? "transitops.db";

export const db = new Database(DB_PATH);

// WAL mode = better read/write concurrency (multiple requests hitting
// the DB at once won't lock each other out as easily).
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

/**
 * Generates a UUID for primary keys.
 * SQLite has no native UUID type, so we generate app-side before insert.
 * Usage: db.query("INSERT INTO vehicles (id, ...) VALUES (?, ...)").run(newId(), ...)
 */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Returns current UTC timestamp in the same string format as
 * SQLite's datetime('now'), for use in app-side inserts/updates.
 */
export function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
import { Database } from "bun:sqlite";

const DB_PATH = Bun.env.DB_PATH ?? "transitops.db";

export const db = new Database(DB_PATH);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
import { db } from "./client";

/**
 * Reads schema.sql and executes it against the current DB.
 * Safe to run multiple times — every statement uses IF NOT EXISTS.
 *
 * Run manually with:  bun run src/db/migrate.ts
 * Or import + call runMigrations() from index.ts on server startup.
 */
export async function runMigrations() {
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const schemaSql = await Bun.file(schemaPath).text();

  db.exec(schemaSql);

  console.log("✅ Migrations applied — schema is up to date.");
}

// Allows running this file directly: `bun run src/db/migrate.ts`
if (import.meta.main) {
  await runMigrations();
}
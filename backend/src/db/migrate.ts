import { db } from "./client";

export async function runMigrations() {
  const schemaPath = new URL("./schema.sql", import.meta.url);
  const schemaSql = await Bun.file(schemaPath).text();

  db.exec(schemaSql);

  console.log("✅ Migrations applied — schema is up to date.");
}

if (import.meta.main) {
  await runMigrations();
}
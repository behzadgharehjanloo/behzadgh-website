import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./database.mjs";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const migrationFiles = fs.readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
const sql = openDatabase();

await sql.query("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");

for (const filename of migrationFiles) {
  const applied = await sql.query("SELECT 1 FROM schema_migrations WHERE version = $1", [filename]);
  if (applied.length) continue;
  const statements = fs.readFileSync(path.join(directory, filename), "utf8")
    .split("-- statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);
  await sql.transaction([
    ...statements.map((statement) => sql.query(statement)),
    sql.query("INSERT INTO schema_migrations (version) VALUES ($1)", [filename])
  ]);
  console.log(`Applied migration ${filename}`);
}

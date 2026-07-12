import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./database.mjs";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations");
const migrationFiles = fs.readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
const database = openDatabase();

try {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT
  `);

  const hasMigration = database.prepare("SELECT 1 FROM schema_migrations WHERE version = ?");
  const recordMigration = database.prepare("INSERT INTO schema_migrations (version) VALUES (?)");

  const applyMigration = database.transaction((version, sql) => {
    database.exec(sql);
    recordMigration.run(version);
  });

  for (const filename of migrationFiles) {
    if (!hasMigration.get(filename)) {
      applyMigration(filename, fs.readFileSync(path.join(directory, filename), "utf8"));
      console.log(`Applied migration ${filename}`);
    }
  }
} finally {
  database.close();
}

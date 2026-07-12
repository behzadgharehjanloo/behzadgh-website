import { databasePath, openDatabase } from "./database.mjs";

const database = openDatabase();

try {
  const result = database.pragma("quick_check", { simple: true });
  if (result !== "ok") {
    throw new Error(`SQLite quick check failed: ${result}`);
  }

  const migrationCount = database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count;
  console.log(`SQLite is healthy at ${databasePath()} (${migrationCount} migration applied).`);
} finally {
  database.close();
}

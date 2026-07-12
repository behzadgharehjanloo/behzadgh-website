import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export function databasePath() {
  return path.resolve(process.env.DATABASE_PATH ?? "./data/behzad.sqlite");
}

export function openDatabase() {
  const filename = databasePath();
  fs.mkdirSync(path.dirname(filename), { recursive: true });

  const database = new Database(filename);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  return database;
}

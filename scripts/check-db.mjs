import { openDatabase } from "./database.mjs";

const sql = openDatabase();
const result = await sql.query("SELECT COUNT(*)::int AS count FROM schema_migrations");
console.log(`Postgres is healthy (${result[0].count} migration applied).`);

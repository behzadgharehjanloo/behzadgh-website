import { getDatabase } from "@/lib/database";

const WINDOW_SECONDS = 60 * 60;
const MAX_ATTEMPTS = 8;

export function subscriptionAllowed(clientKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const database = getDatabase();
  database.prepare("DELETE FROM subscription_attempts WHERE window_started_at <= ?").run(now - 24 * 60 * 60);
  const row = database.prepare(
    "SELECT window_started_at, attempts, blocked_until FROM subscription_attempts WHERE client_key = ?"
  ).get(clientKey) as { window_started_at: number; attempts: number; blocked_until: number | null } | undefined;

  if (row?.blocked_until && row.blocked_until > now) return false;
  if (!row || row.window_started_at <= now - WINDOW_SECONDS) {
    database.prepare(
      "INSERT INTO subscription_attempts (client_key, window_started_at, attempts, blocked_until) VALUES (?, ?, 1, NULL) ON CONFLICT(client_key) DO UPDATE SET window_started_at = excluded.window_started_at, attempts = 1, blocked_until = NULL"
    ).run(clientKey, now);
    return true;
  }

  const attempts = row.attempts + 1;
  database.prepare("UPDATE subscription_attempts SET attempts = ?, blocked_until = ? WHERE client_key = ?")
    .run(attempts, attempts > MAX_ATTEMPTS ? now + WINDOW_SECONDS : null, clientKey);
  return attempts <= MAX_ATTEMPTS;
}

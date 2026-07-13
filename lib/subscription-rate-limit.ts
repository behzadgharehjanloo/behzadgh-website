import { query } from "@/lib/database";

const WINDOW_SECONDS = 60 * 60;
const MAX_ATTEMPTS = 8;

export async function subscriptionAllowed(clientKey: string) {
  const now = Math.floor(Date.now() / 1000);
  await query("DELETE FROM subscription_attempts WHERE window_started_at <= $1", [now - 24 * 60 * 60]);
  const rows = await query<{ attempts: number; blocked_until: string | number | null }>(
    `INSERT INTO subscription_attempts (client_key, window_started_at, attempts, blocked_until)
     VALUES ($1, $2, 1, NULL)
     ON CONFLICT (client_key) DO UPDATE SET
       attempts = CASE WHEN subscription_attempts.window_started_at <= $3 THEN 1 ELSE subscription_attempts.attempts + 1 END,
       window_started_at = CASE WHEN subscription_attempts.window_started_at <= $3 THEN $2 ELSE subscription_attempts.window_started_at END,
       blocked_until = CASE
         WHEN subscription_attempts.window_started_at <= $3 THEN NULL
         WHEN subscription_attempts.attempts + 1 > $4 THEN $5
         ELSE subscription_attempts.blocked_until
       END
     RETURNING attempts, blocked_until`,
    [clientKey, now, now - WINDOW_SECONDS, MAX_ATTEMPTS, now + WINDOW_SECONDS]
  );
  const row = rows[0];
  return row.attempts <= MAX_ATTEMPTS && (!row.blocked_until || Number(row.blocked_until) <= now);
}

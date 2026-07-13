import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { deriveEmailToken } from "./email-tokens.mjs";
import { confirmationEmail, welcomeEmail } from "../scripts/email-templates.mjs";
import { buildRawMessage, sendWithGmailApi } from "./gmail-service.mjs";

function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  return neon(process.env.DATABASE_URL);
}

export async function processEmailOutbox(limit = 10) {
  const sql = database();
  const workerId = randomUUID();
  const now = () => Math.floor(Date.now() / 1000);
  const summary = { processed: 0, sent: 0, retained: 0, cancelled: 0 };

  await sql.query(
    "UPDATE email_outbox SET status = 'queued', worker_id = NULL, locked_at = NULL WHERE status = 'sending' AND locked_at <= $1",
    [now() - 10 * 60]
  );

  for (let processed = 0; processed < limit; processed += 1) {
    const claimed = await sql.query(
      `UPDATE email_outbox SET status = 'sending', worker_id = $1, locked_at = $2
       WHERE id = (
         SELECT id FROM email_outbox
         WHERE status = 'queued' AND next_attempt_at <= $2
         ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1
       ) AND status = 'queued'
       RETURNING id`,
      [workerId, now()]
    );
    if (!claimed.length) break;
    const rows = await sql.query(
      `SELECT o.id, o.subscriber_id, o.kind, o.attempts, s.email, s.status AS subscriber_status,
              s.confirmation_nonce, s.unsubscribe_nonce
       FROM email_outbox o JOIN subscribers s ON s.id = o.subscriber_id
       WHERE o.id = $1 AND o.worker_id = $2`,
      [claimed[0].id, workerId]
    );
    const row = rows[0];
    if (!row) continue;
    summary.processed += 1;

    try {
      let content;
      if (row.kind === "confirmation") {
        if (row.subscriber_status !== "pending" || !row.confirmation_nonce) {
          await sql.query(
            "UPDATE email_outbox SET status = 'cancelled', last_error = $1, worker_id = NULL, locked_at = NULL WHERE id = $2 AND worker_id = $3",
            ["Subscriber is no longer pending", row.id, workerId]
          );
          summary.cancelled += 1;
          continue;
        }
        content = confirmationEmail(deriveEmailToken("confirm", row.email, row.confirmation_nonce));
      } else {
        if (row.subscriber_status !== "active" || !row.unsubscribe_nonce) {
          await sql.query(
            "UPDATE email_outbox SET status = 'cancelled', last_error = $1, worker_id = NULL, locked_at = NULL WHERE id = $2 AND worker_id = $3",
            ["Subscriber is not active", row.id, workerId]
          );
          summary.cancelled += 1;
          continue;
        }
        content = welcomeEmail(deriveEmailToken("unsubscribe", row.email, row.unsubscribe_nonce));
      }

      const rawMessage = await buildRawMessage({ to: row.email, messageKey: `outbox:${row.id}`, ...content });
      const gmailMessageId = await sendWithGmailApi(rawMessage);
      const sentAt = now();
      await sql.query(
        `WITH delivered AS (
           UPDATE email_outbox SET status = 'sent', sent_at = $1, gmail_message_id = $2,
             last_error = NULL, worker_id = NULL, locked_at = NULL
           WHERE id = $3 AND worker_id = $4 RETURNING subscriber_id, kind
         )
         UPDATE subscribers SET welcome_sent_at = CASE WHEN delivered.kind = 'welcome' THEN $1 ELSE subscribers.welcome_sent_at END,
           updated_at = CASE WHEN delivered.kind = 'welcome' THEN $1 ELSE subscribers.updated_at END
         FROM delivered WHERE subscribers.id = delivered.subscriber_id`,
        [sentAt, gmailMessageId, row.id, workerId]
      );
      summary.sent += 1;
    } catch (error) {
      const attempts = Number(row.attempts) + 1;
      const permanent = attempts >= 8;
      const delay = Math.min(6 * 60 * 60, 60 * 2 ** Math.min(attempts - 1, 8));
      const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown email delivery error";
      await sql.query(
        "UPDATE email_outbox SET status = $1, attempts = $2, next_attempt_at = $3, last_error = $4, worker_id = NULL, locked_at = NULL WHERE id = $5 AND worker_id = $6",
        [permanent ? "failed" : "queued", attempts, now() + delay, message, row.id, workerId]
      );
      summary.retained += 1;
    }
  }
  return summary;
}

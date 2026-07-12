import { randomUUID } from "node:crypto";
import { openDatabase } from "./database.mjs";
import { deriveEmailToken } from "../lib/email-tokens.mjs";
import { confirmationEmail, welcomeEmail } from "./email-templates.mjs";
import { buildRawMessage, sendWithGmailApi } from "./gmail-api.mjs";

const database = openDatabase();
const workerId = randomUUID();
const now = () => Math.floor(Date.now() / 1000);

function claimNext() {
  return database.transaction(() => {
    database.prepare(
      "UPDATE email_outbox SET status = 'queued', worker_id = NULL, locked_at = NULL WHERE status = 'sending' AND locked_at <= ?"
    ).run(now() - 10 * 60);
    const row = database.prepare(
      "SELECT id FROM email_outbox WHERE status = 'queued' AND next_attempt_at <= ? ORDER BY id LIMIT 1"
    ).get(now());
    if (!row) return null;
    const claimed = database.prepare(
      "UPDATE email_outbox SET status = 'sending', worker_id = ?, locked_at = ? WHERE id = ? AND status = 'queued'"
    ).run(workerId, now(), row.id);
    if (!claimed.changes) return null;
    return database.prepare(
      "SELECT o.id, o.kind, o.attempts, s.id AS subscriber_id, s.email, s.status AS subscriber_status, s.confirmation_nonce, s.unsubscribe_nonce FROM email_outbox o JOIN subscribers s ON s.id = o.subscriber_id WHERE o.id = ?"
    ).get(row.id);
  })();
}

function cancel(id, reason) {
  database.prepare(
    "UPDATE email_outbox SET status = 'cancelled', last_error = ?, worker_id = NULL, locked_at = NULL WHERE id = ?"
  ).run(reason, id);
}

function fail(row, error) {
  const attempts = row.attempts + 1;
  const permanent = attempts >= 8;
  const delay = Math.min(6 * 60 * 60, 60 * 2 ** Math.min(attempts - 1, 8));
  const message = error instanceof Error ? error.message.slice(0, 300) : "Unknown email delivery error";
  database.prepare(
    "UPDATE email_outbox SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?, worker_id = NULL, locked_at = NULL WHERE id = ?"
  ).run(permanent ? "failed" : "queued", attempts, now() + delay, message, row.id);
}

try {
  for (let processed = 0; processed < 10; processed += 1) {
    const row = claimNext();
    if (!row) break;
    try {
      let content;
      if (row.kind === "confirmation") {
        if (row.subscriber_status !== "pending" || !row.confirmation_nonce) {
          cancel(row.id, "Subscriber is no longer pending");
          continue;
        }
        content = confirmationEmail(deriveEmailToken("confirm", row.email, row.confirmation_nonce));
      } else {
        if (row.subscriber_status !== "active" || !row.unsubscribe_nonce) {
          cancel(row.id, "Subscriber is not active");
          continue;
        }
        content = welcomeEmail(deriveEmailToken("unsubscribe", row.email, row.unsubscribe_nonce));
      }

      const rawMessage = await buildRawMessage({ to: row.email, messageKey: `outbox:${row.id}`, ...content });
      const gmailMessageId = await sendWithGmailApi(rawMessage);
      database.prepare(
        "UPDATE email_outbox SET status = 'sent', sent_at = ?, gmail_message_id = ?, last_error = NULL, worker_id = NULL, locked_at = NULL WHERE id = ?"
      ).run(now(), gmailMessageId, row.id);
      console.log(`Sent ${row.kind} message for outbox item ${row.id}`);
    } catch (error) {
      fail(row, error);
      console.error(`Email outbox item ${row.id} could not be sent and was retained for retry.`);
    }
  }
} finally {
  database.close();
}

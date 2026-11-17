import { randomUUID } from "node:crypto";
import { deriveEmailToken } from "./email-tokens.mjs";
import { confirmationEmail } from "../scripts/email-templates.mjs";
import { buildRawMessage, sendWithGmailApi } from "./gmail-service.mjs";

/** Immediately attempts only the current pending confirmation; leaves queued retry intact on failure. */
export async function deliverImmediateConfirmation(record, overrides = {}) {
  const { query, deriveEmailToken: token = deriveEmailToken,
    confirmationEmail: template = confirmationEmail, buildRawMessage: build = buildRawMessage,
    sendWithGmailApi: send = sendWithGmailApi } = overrides;
  if (typeof query !== "function") throw new Error("A database query function is required");
  if (!record.confirmationNonce) return "unavailable";
  const workerId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const claimed = await query(
    `UPDATE email_outbox SET status = 'sending', worker_id = $1, locked_at = $2
     WHERE id = (SELECT o.id FROM email_outbox o JOIN subscribers s ON s.id = o.subscriber_id
       WHERE o.subscriber_id = $3 AND o.kind = 'confirmation' AND o.status = 'queued'
         AND o.next_attempt_at <= $2 AND s.status = 'pending' AND s.confirmation_nonce = $4
       ORDER BY o.id DESC FOR UPDATE OF o SKIP LOCKED LIMIT 1)
     RETURNING id`,
    [workerId, now, record.subscriberId, record.confirmationNonce]
  );
  if (!claimed.length) return "already_processing_or_queued";
  const outboxId = claimed[0].id;
  try {
    const content = template(token("confirm", record.email, record.confirmationNonce));
    const raw = await build({ to: record.email, messageKey: `outbox:${outboxId}`, ...content });
    const messageId = await send(raw);
    await query(
      `UPDATE email_outbox SET status = 'sent', sent_at = $1, gmail_message_id = $2,
         last_error = NULL, worker_id = NULL, locked_at = NULL
       WHERE id = $3 AND worker_id = $4 AND status = 'sending'`,
      [Math.floor(Date.now() / 1000), messageId, outboxId, workerId]
    );
    return "sent";
  } catch {
    await query(
      `UPDATE email_outbox SET status = 'queued', attempts = attempts + 1,
         next_attempt_at = $1, last_error = 'Immediate confirmation delivery failed; retained for retry',
         worker_id = NULL, locked_at = NULL
       WHERE id = $2 AND worker_id = $3 AND status = 'sending'`,
      [Math.floor(Date.now() / 1000) + 60, outboxId, workerId]
    );
    return "queued";
  }
}

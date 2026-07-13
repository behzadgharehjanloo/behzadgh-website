import { deriveEmailToken } from "./email-tokens.mjs";
import { welcomeEmail } from "../scripts/email-templates.mjs";
import { buildRawMessage, sendWithGmailApi } from "./gmail-service.mjs";

const defaultDependencies = { deriveEmailToken, welcomeEmail, buildRawMessage, sendWithGmailApi };

export async function deliverImmediateWelcome(record, overrides = {}) {
  const dependencies = { ...defaultDependencies, ...overrides };
  if (typeof dependencies.query !== "function") throw new Error("A database query function is required");
  const unsubscribeToken = dependencies.deriveEmailToken("unsubscribe", record.email, record.unsubscribeNonce);
  const content = dependencies.welcomeEmail(unsubscribeToken);
  const now = Math.floor(Date.now() / 1000);

  try {
    const rawMessage = await dependencies.buildRawMessage({
      to: record.email,
      messageKey: `outbox:${record.outboxId}`,
      ...content
    });
    const gmailMessageId = await dependencies.sendWithGmailApi(rawMessage);
    await dependencies.query(
      `WITH delivered AS (
         UPDATE email_outbox SET status = 'sent', sent_at = $1, gmail_message_id = $2,
           last_error = NULL, worker_id = NULL, locked_at = NULL
         WHERE id = $3 AND worker_id = $4 AND status = 'sending'
         RETURNING subscriber_id
       )
       UPDATE subscribers SET welcome_sent_at = $1, updated_at = $1
       WHERE id = $5 AND id IN (SELECT subscriber_id FROM delivered)`,
      [now, gmailMessageId, record.outboxId, record.workerId, record.subscriberId]
    );
    return "sent";
  } catch {
    await dependencies.query(
      `UPDATE email_outbox SET status = 'queued', attempts = attempts + 1, next_attempt_at = $1,
         last_error = 'Immediate Gmail delivery failed; retained for retry', worker_id = NULL, locked_at = NULL
       WHERE id = $2 AND worker_id = $3 AND status = 'sending'`,
      [now + 60, record.outboxId, record.workerId]
    );
    return "queued";
  }
}

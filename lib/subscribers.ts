import { createHash, randomBytes, randomUUID } from "node:crypto";
import { query } from "@/lib/database";
import { deriveEmailToken, emailTokenSecretConfigured } from "@/lib/email-tokens.mjs";
export { normalizeEmail } from "@/lib/email-address.mjs";

const CONSENT_VERSION = "newsletter-v1";
export type SubscriberStatus = "pending" | "active" | "unsubscribed" | "suppressed";

export function hashUnsubscribeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function nonce() {
  return randomBytes(18).toString("base64url");
}

export async function subscribe(email: string) {
  if (!emailTokenSecretConfigured()) throw new Error("Email token configuration is unavailable");
  const now = Math.floor(Date.now() / 1000);
  const confirmationExpiry = now + 7 * 24 * 60 * 60;
  const unsubscribeNonce = nonce();
  const confirmationNonce = nonce();
  const unsubscribeHash = hashUnsubscribeToken(deriveEmailToken("unsubscribe", email, unsubscribeNonce));
  const confirmationHash = hashUnsubscribeToken(deriveEmailToken("confirm", email, confirmationNonce));
  const workerId = randomUUID();

  const inserted = await query<{ id: string | number; outbox_id: string | number }>(
    `WITH inserted AS (
       INSERT INTO subscribers (email, status, unsubscribe_token_hash, consented_at, consent_source, consent_version, created_at, updated_at, unsubscribe_nonce, confirmation_nonce, confirmation_token_hash, confirmation_expires_at, confirmed_at)
       VALUES ($1, 'active', $2, $3, 'website-subscribe-form', $4, $3, $3, $5, NULL, NULL, NULL, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id
     ), claimed AS (
       INSERT INTO email_outbox (subscriber_id, kind, dedupe_key, status, next_attempt_at, locked_at, worker_id, created_at)
       SELECT id, 'welcome', 'welcome:' || id || ':initial', 'sending', $3, $3, $6, $3 FROM inserted
       ON CONFLICT (dedupe_key) DO NOTHING
       RETURNING id, subscriber_id
     )
     SELECT inserted.id, claimed.id AS outbox_id FROM inserted JOIN claimed ON claimed.subscriber_id = inserted.id`,
    [email, unsubscribeHash, now, CONSENT_VERSION, unsubscribeNonce, workerId]
  );
  if (inserted.length) {
    return {
      outcome: "created" as const,
      subscriberId: inserted[0].id,
      outboxId: inserted[0].outbox_id,
      workerId,
      email,
      unsubscribeNonce
    };
  }

  const rows = await query<{
    id: string | number;
    status: SubscriberStatus;
    confirmation_nonce: string | null;
    confirmation_expires_at: string | number | null;
    consented_at: string | number;
  }>("SELECT id, status, confirmation_nonce, confirmation_expires_at, consented_at FROM subscribers WHERE email = $1", [email]);
  const existing = rows[0];
  if (!existing) return { outcome: "unavailable" as const };
  if (existing.status === "active") return { outcome: "duplicate_active" as const };
  if (existing.status === "suppressed") return { outcome: "unavailable" as const };

  if (existing.status === "unsubscribed") {
    await query(
      `WITH updated AS (
         UPDATE subscribers SET status = 'pending', unsubscribe_token_hash = $1, consented_at = $2,
           consent_source = 'website-subscribe-form', consent_version = $3, updated_at = $2,
           unsubscribed_at = NULL, unsubscribe_nonce = $4, confirmation_nonce = $5,
           confirmation_token_hash = $6, confirmation_expires_at = $7, confirmed_at = NULL
         WHERE id = $8 AND status = 'unsubscribed' RETURNING id
       ), cancelled AS (
         UPDATE email_outbox SET status = 'cancelled', last_error = 'Replaced by a newer confirmation request', worker_id = NULL, locked_at = NULL
         WHERE subscriber_id IN (SELECT id FROM updated) AND kind = 'confirmation' AND status IN ('queued', 'sending')
       )
       INSERT INTO email_outbox (subscriber_id, kind, dedupe_key, next_attempt_at, created_at)
       SELECT id, 'confirmation', 'confirmation:' || id || ':' || $5, $2, $2 FROM updated
       ON CONFLICT (dedupe_key) DO NOTHING`,
      [unsubscribeHash, now, CONSENT_VERSION, unsubscribeNonce, confirmationNonce, confirmationHash, confirmationExpiry, existing.id]
    );
    return { outcome: "confirmation_required" as const };
  }

  const expired = !existing.confirmation_expires_at || Number(existing.confirmation_expires_at) <= now;
  const resendAllowed = Number(existing.consented_at) <= now - 15 * 60;
  if (!existing.confirmation_nonce || expired || resendAllowed) {
    await query(
      `WITH updated AS (
         UPDATE subscribers SET unsubscribe_nonce = $1, unsubscribe_token_hash = $2,
           confirmation_nonce = $3, confirmation_token_hash = $4, confirmation_expires_at = $5,
           consented_at = $6, updated_at = $6
         WHERE id = $7 AND status = 'pending' AND confirmation_nonce IS NOT DISTINCT FROM $8
         RETURNING id
       ), cancelled AS (
         UPDATE email_outbox SET status = 'cancelled', last_error = 'Replaced by a newer confirmation request', worker_id = NULL, locked_at = NULL
         WHERE subscriber_id IN (SELECT id FROM updated) AND kind = 'confirmation' AND status IN ('queued', 'sending')
       )
       INSERT INTO email_outbox (subscriber_id, kind, dedupe_key, next_attempt_at, created_at)
       SELECT id, 'confirmation', 'confirmation:' || id || ':' || $3, $6, $6 FROM updated
       ON CONFLICT (dedupe_key) DO NOTHING`,
      [unsubscribeNonce, unsubscribeHash, confirmationNonce, confirmationHash, confirmationExpiry, now, existing.id, existing.confirmation_nonce]
    );
  }
  return { outcome: "confirmation_required" as const };
}

export async function confirmByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const now = Math.floor(Date.now() / 1000);
  const rows = await query<{ id: string | number }>(
    `WITH updated AS (
       UPDATE subscribers SET status = 'active', confirmed_at = $1, updated_at = $1,
         confirmation_token_hash = NULL, confirmation_expires_at = NULL
       WHERE confirmation_token_hash = $2 AND status = 'pending' AND confirmation_expires_at > $1
       RETURNING id
     ), cancelled AS (
       UPDATE email_outbox SET status = 'cancelled', last_error = 'Subscription confirmed', worker_id = NULL, locked_at = NULL
       WHERE subscriber_id IN (SELECT id FROM updated) AND kind = 'confirmation' AND status IN ('queued', 'sending')
     ), queued AS (
       INSERT INTO email_outbox (subscriber_id, kind, dedupe_key, next_attempt_at, created_at)
       SELECT id, 'welcome', 'welcome:' || id || ':' || $1, $1, $1 FROM updated
       ON CONFLICT (dedupe_key) DO NOTHING
     )
     SELECT id FROM updated`,
    [now, hashUnsubscribeToken(token)]
  );
  return rows.length > 0;
}

export async function confirmationForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const now = Math.floor(Date.now() / 1000);
  const rows = await query<{ status: SubscriberStatus; confirmation_expires_at: string | number }>(
    "SELECT status, confirmation_expires_at FROM subscribers WHERE confirmation_token_hash = $1 AND confirmation_expires_at > $2",
    [hashUnsubscribeToken(token), now]
  );
  return rows[0] ?? null;
}

export async function unsubscribeByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const now = Math.floor(Date.now() / 1000);
  const rows = await query<{ id: string | number }>(
    "UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = $1, updated_at = $1 WHERE unsubscribe_token_hash = $2 AND status IN ('pending', 'active') RETURNING id",
    [now, hashUnsubscribeToken(token)]
  );
  return rows.length > 0;
}

export async function subscriberForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const rows = await query<{ status: SubscriberStatus }>(
    "SELECT status FROM subscribers WHERE unsubscribe_token_hash = $1",
    [hashUnsubscribeToken(token)]
  );
  return rows[0] ?? null;
}

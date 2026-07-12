import { createHash, randomBytes } from "node:crypto";
import { domainToASCII } from "node:url";
import { query } from "@/lib/database";
import { deriveEmailToken, emailTokenSecretConfigured } from "@/lib/email-tokens.mjs";

const CONSENT_VERSION = "newsletter-v1";
export type SubscriberStatus = "pending" | "active" | "unsubscribed" | "suppressed";

export function normalizeEmail(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > 254 || /[\u0000-\u0020\u007f]/.test(trimmed)) return null;
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at !== trimmed.indexOf("@")) return null;
  const local = trimmed.slice(0, at);
  const asciiDomain = domainToASCII(trimmed.slice(at + 1));
  if (!asciiDomain || local.length > 64 || asciiDomain.length > 253 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  if (!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return null;
  const labels = asciiDomain.split(".");
  if (labels.length < 2 || labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) return null;
  return `${local.toLowerCase()}@${asciiDomain.toLowerCase()}`;
}

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

  const inserted = await query<{ id: string | number }>(
    `WITH inserted AS (
       INSERT INTO subscribers (email, status, unsubscribe_token_hash, consented_at, consent_source, consent_version, created_at, updated_at, unsubscribe_nonce, confirmation_nonce, confirmation_token_hash, confirmation_expires_at)
       VALUES ($1, 'pending', $2, $3, 'website-subscribe-form', $4, $3, $3, $5, $6, $7, $8)
       ON CONFLICT (email) DO NOTHING
       RETURNING id
     ), queued AS (
       INSERT INTO email_outbox (subscriber_id, kind, dedupe_key, next_attempt_at, created_at)
       SELECT id, 'confirmation', 'confirmation:' || id || ':' || $6, $3, $3 FROM inserted
       ON CONFLICT (dedupe_key) DO NOTHING
     )
     SELECT id FROM inserted`,
    [email, unsubscribeHash, now, CONSENT_VERSION, unsubscribeNonce, confirmationNonce, confirmationHash, confirmationExpiry]
  );
  if (inserted.length) return;

  const rows = await query<{
    id: string | number;
    status: SubscriberStatus;
    confirmation_nonce: string | null;
    confirmation_expires_at: string | number | null;
    consented_at: string | number;
  }>("SELECT id, status, confirmation_nonce, confirmation_expires_at, consented_at FROM subscribers WHERE email = $1", [email]);
  const existing = rows[0];
  if (!existing || existing.status === "active" || existing.status === "suppressed") return;

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
    return;
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

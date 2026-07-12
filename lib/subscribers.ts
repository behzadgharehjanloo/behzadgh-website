import { createHash, randomBytes } from "node:crypto";
import { domainToASCII } from "node:url";
import { getDatabase } from "@/lib/database";
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

function queueConfirmation(subscriberId: number, confirmationNonce: string, now: number) {
  getDatabase().prepare(
    "INSERT OR IGNORE INTO email_outbox (subscriber_id, kind, dedupe_key, next_attempt_at, created_at) VALUES (?, 'confirmation', ?, ?, ?)"
  ).run(subscriberId, `confirmation:${subscriberId}:${confirmationNonce}`, now, now);
}

function cancelQueuedConfirmations(subscriberId: number) {
  getDatabase().prepare(
    "UPDATE email_outbox SET status = 'cancelled', last_error = 'Replaced by a newer confirmation request', worker_id = NULL, locked_at = NULL WHERE subscriber_id = ? AND kind = 'confirmation' AND status IN ('queued', 'sending')"
  ).run(subscriberId);
}

export function subscribe(email: string) {
  if (!emailTokenSecretConfigured()) throw new Error("Email token configuration is unavailable");
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const confirmationExpiry = now + 7 * 24 * 60 * 60;
  const existing = database.prepare("SELECT id, status FROM subscribers WHERE email = ?").get(email) as
    | { id: number; status: SubscriberStatus }
    | undefined;

  const operation = database.transaction(() => {
    if (!existing) {
      const unsubscribeNonce = nonce();
      const confirmationNonce = nonce();
      const unsubscribeToken = deriveEmailToken("unsubscribe", email, unsubscribeNonce);
      const confirmationToken = deriveEmailToken("confirm", email, confirmationNonce);
      const result = database.prepare(
        "INSERT INTO subscribers (email, status, unsubscribe_token_hash, consented_at, consent_source, consent_version, created_at, updated_at, unsubscribe_nonce, confirmation_nonce, confirmation_token_hash, confirmation_expires_at) VALUES (?, 'pending', ?, ?, 'website-subscribe-form', ?, ?, ?, ?, ?, ?, ?)"
      ).run(email, hashUnsubscribeToken(unsubscribeToken), now, CONSENT_VERSION, now, now, unsubscribeNonce, confirmationNonce, hashUnsubscribeToken(confirmationToken), confirmationExpiry);
      queueConfirmation(Number(result.lastInsertRowid), confirmationNonce, now);
      return;
    }

    if (existing.status === "unsubscribed") {
      const unsubscribeNonce = nonce();
      const confirmationNonce = nonce();
      cancelQueuedConfirmations(existing.id);
      database.prepare(
        "UPDATE subscribers SET status = 'pending', unsubscribe_token_hash = ?, consented_at = ?, consent_source = 'website-subscribe-form', consent_version = ?, updated_at = ?, unsubscribed_at = NULL, unsubscribe_nonce = ?, confirmation_nonce = ?, confirmation_token_hash = ?, confirmation_expires_at = ?, confirmed_at = NULL WHERE id = ?"
      ).run(
        hashUnsubscribeToken(deriveEmailToken("unsubscribe", email, unsubscribeNonce)),
        now,
        CONSENT_VERSION,
        now,
        unsubscribeNonce,
        confirmationNonce,
        hashUnsubscribeToken(deriveEmailToken("confirm", email, confirmationNonce)),
        confirmationExpiry,
        existing.id
      );
      queueConfirmation(existing.id, confirmationNonce, now);
      return;
    }

    if (existing.status === "pending") {
      const row = database.prepare(
        "SELECT confirmation_nonce, confirmation_expires_at, consented_at FROM subscribers WHERE id = ?"
      ).get(existing.id) as { confirmation_nonce: string | null; confirmation_expires_at: number | null; consented_at: number };
      if (!row.confirmation_nonce || !row.confirmation_expires_at || row.confirmation_expires_at <= now || row.consented_at <= now - 15 * 60) {
        const confirmationNonce = nonce();
        const unsubscribeNonce = nonce();
        cancelQueuedConfirmations(existing.id);
        database.prepare(
          "UPDATE subscribers SET unsubscribe_nonce = ?, unsubscribe_token_hash = ?, confirmation_nonce = ?, confirmation_token_hash = ?, confirmation_expires_at = ?, consented_at = ?, updated_at = ? WHERE id = ?"
        ).run(
          unsubscribeNonce,
          hashUnsubscribeToken(deriveEmailToken("unsubscribe", email, unsubscribeNonce)),
          confirmationNonce,
          hashUnsubscribeToken(deriveEmailToken("confirm", email, confirmationNonce)),
          confirmationExpiry,
          now,
          now,
          existing.id
        );
        queueConfirmation(existing.id, confirmationNonce, now);
      }
    }
  });

  operation();
}

export function confirmByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const subscriber = database.prepare(
    "SELECT id, confirmation_nonce FROM subscribers WHERE confirmation_token_hash = ? AND status = 'pending' AND confirmation_expires_at > ?"
  ).get(hashUnsubscribeToken(token), now) as { id: number; confirmation_nonce: string } | undefined;
  if (!subscriber) return false;

  database.transaction(() => {
    const changed = database.prepare(
      "UPDATE subscribers SET status = 'active', confirmed_at = ?, updated_at = ?, confirmation_token_hash = NULL, confirmation_expires_at = NULL WHERE id = ? AND status = 'pending'"
    ).run(now, now, subscriber.id);
    if (changed.changes) {
      cancelQueuedConfirmations(subscriber.id);
      database.prepare(
        "INSERT OR IGNORE INTO email_outbox (subscriber_id, kind, dedupe_key, next_attempt_at, created_at) VALUES (?, 'welcome', ?, ?, ?)"
      ).run(subscriber.id, `welcome:${subscriber.id}:${now}`, now, now);
    }
  })();
  return true;
}

export function confirmationForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const now = Math.floor(Date.now() / 1000);
  return getDatabase().prepare(
    "SELECT status, confirmation_expires_at FROM subscribers WHERE confirmation_token_hash = ? AND confirmation_expires_at > ?"
  ).get(hashUnsubscribeToken(token), now) as { status: SubscriberStatus; confirmation_expires_at: number } | undefined ?? null;
}

export function unsubscribeByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const now = Math.floor(Date.now() / 1000);
  const result = getDatabase().prepare(
    "UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = ?, updated_at = ? WHERE unsubscribe_token_hash = ? AND status IN ('pending', 'active')"
  ).run(now, now, hashUnsubscribeToken(token));
  return result.changes > 0;
}

export function subscriberForToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return getDatabase().prepare(
    "SELECT status FROM subscribers WHERE unsubscribe_token_hash = ?"
  ).get(hashUnsubscribeToken(token)) as { status: SubscriberStatus } | undefined ?? null;
}

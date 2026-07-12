import { createHash, randomBytes } from "node:crypto";
import { domainToASCII } from "node:url";
import { getDatabase } from "@/lib/database";

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

export function subscribe(email: string) {
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);
  const existing = database.prepare("SELECT id, status FROM subscribers WHERE email = ?").get(email) as
    | { id: number; status: SubscriberStatus }
    | undefined;

  if (!existing) {
    const token = randomBytes(32).toString("base64url");
    database.prepare(
      "INSERT INTO subscribers (email, status, unsubscribe_token_hash, consented_at, consent_source, consent_version, created_at, updated_at) VALUES (?, 'pending', ?, ?, 'website-subscribe-form', ?, ?, ?)"
    ).run(email, hashUnsubscribeToken(token), now, CONSENT_VERSION, now, now);
    return;
  }

  if (existing.status === "unsubscribed") {
    const token = randomBytes(32).toString("base64url");
    database.prepare(
      "UPDATE subscribers SET status = 'pending', unsubscribe_token_hash = ?, consented_at = ?, consent_source = 'website-subscribe-form', consent_version = ?, updated_at = ?, unsubscribed_at = NULL WHERE id = ?"
    ).run(hashUnsubscribeToken(token), now, CONSENT_VERSION, now, existing.id);
  }
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

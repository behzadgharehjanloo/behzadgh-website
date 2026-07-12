import { createHmac } from "node:crypto";

function secretBuffer() {
  const value = process.env.EMAIL_TOKEN_SECRET;
  if (!value) throw new Error("EMAIL_TOKEN_SECRET is not configured");
  const secret = Buffer.from(value, "base64url");
  if (secret.length !== 32) throw new Error("EMAIL_TOKEN_SECRET must be a 32-byte base64url value");
  return secret;
}

export function emailTokenSecretConfigured() {
  try {
    secretBuffer();
    return true;
  } catch {
    return false;
  }
}

export function deriveEmailToken(purpose, identity, nonce) {
  return createHmac("sha256", secretBuffer())
    .update(`${purpose}\n${identity}\n${nonce}`, "utf8")
    .digest("base64url");
}

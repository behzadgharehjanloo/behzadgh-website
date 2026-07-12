import { createHash, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";

const SENDER_ADDRESS = "still@behzadgh.com";
const SENDER_NAME = "Behzad Gharehjanloo";
let cachedAccessToken;
let accessTokenExpiresAt = 0;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

async function accessToken() {
  if (cachedAccessToken && accessTokenExpiresAt > Date.now() + 60_000) return cachedAccessToken;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: required("GOOGLE_CLIENT_ID"),
      client_secret: required("GOOGLE_CLIENT_SECRET"),
      refresh_token: required("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token"
    }),
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Google OAuth token request failed with status ${response.status}`);
  const result = await response.json();
  if (typeof result.access_token !== "string") throw new Error("Google OAuth response did not contain an access token");
  cachedAccessToken = result.access_token;
  accessTokenExpiresAt = Date.now() + Number(result.expires_in ?? 3600) * 1000;
  return cachedAccessToken;
}

export async function buildRawMessage({ to, subject, text, html, unsubscribeUrl, messageKey = randomUUID() }) {
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
  const headers = [{ key: "X-Auto-Response-Suppress", value: "All" }];
  if (unsubscribeUrl) {
    headers.push(
      { key: "List-ID", value: "Behzad Gharehjanloo Notes <notes.behzadgh.com>" },
      { key: "List-Unsubscribe", value: `<${unsubscribeUrl}>` },
      { key: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" }
    );
  }
  const result = await transport.sendMail({
    from: { name: SENDER_NAME, address: SENDER_ADDRESS },
    replyTo: SENDER_ADDRESS,
    to,
    subject,
    text,
    html,
    date: new Date(),
    messageId: `<${createHash("sha256").update(messageKey).digest("hex").slice(0, 32)}@behzadgh.com>`,
    headers
  });
  return result.message;
}

export async function sendWithGmailApi(message) {
  const raw = Buffer.from(message).toString("base64url");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(20_000)
  });
  if (!response.ok) throw new Error(`Gmail API send failed with status ${response.status}`);
  const result = await response.json();
  if (typeof result.id !== "string") throw new Error("Gmail API response did not contain a message id");
  return result.id;
}

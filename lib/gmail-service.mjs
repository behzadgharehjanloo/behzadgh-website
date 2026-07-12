import { createHash, randomUUID } from "node:crypto";
import { google } from "googleapis";
import nodemailer from "nodemailer";

const SENDER_ADDRESS = "still@behzadgh.com";
const SENDER_NAME = "Behzad Gharehjanloo";

let cachedService;

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

/**
 * Returns a reusable Gmail client backed by an OAuth 2.0 refresh token.
 * Credentials remain in the server process and are refreshed by googleapis.
 */
export function getGmailService() {
  if (cachedService) return cachedService;

  const oauth = new google.auth.OAuth2(
    requiredEnvironment("GOOGLE_CLIENT_ID"),
    requiredEnvironment("GOOGLE_CLIENT_SECRET")
  );
  oauth.setCredentials({ refresh_token: requiredEnvironment("GOOGLE_REFRESH_TOKEN") });
  cachedService = google.gmail({ version: "v1", auth: oauth });
  return cachedService;
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

/**
 * Sends a prebuilt RFC 5322 message. The optional client makes this function
 * testable without contacting Google while preserving the existing one-argument API.
 */
export async function sendWithGmailApi(message, gmail = getGmailService()) {
  try {
    const response = await gmail.users.messages.send(
      { userId: "me", requestBody: { raw: Buffer.from(message).toString("base64url") } },
      { timeout: 20_000 }
    );
    if (typeof response.data.id !== "string" || !response.data.id) {
      throw new Error("Gmail response did not contain a message id");
    }
    return response.data.id;
  } catch {
    // Keep provider responses, request metadata, recipients, and credentials out of logs/outbox rows.
    throw new Error("Gmail API delivery failed");
  }
}

import { createHash, randomUUID } from "node:crypto";
import { google } from "googleapis";
import nodemailer from "nodemailer";

const SENDER_ADDRESS = "still@behzadgh.com";
const SENDER_NAME = "Behzad Gharehjanloo";
const OAUTH_REFRESH_TIMEOUT_MS = 10_000;

const SAFE_OAUTH_ERRORS = new Set([
  "access_denied",
  "invalid_client",
  "invalid_grant",
  "invalid_request",
  "invalid_scope",
  "unauthorized_client",
  "unsupported_grant_type"
]);

const SAFE_DIAGNOSTIC_CATEGORIES = new Set([
  "connection_error",
  "dns_error",
  "google_http_error",
  "request_aborted",
  "timeout",
  "tls_error",
  "transport_error"
]);

const DNS_ERROR_CODES = new Set(["EAI_AGAIN", "ENODATA", "ENOTFOUND"]);
const TIMEOUT_ERROR_CODES = new Set(["ETIMEDOUT", "ESOCKETTIMEDOUT"]);
const CONNECTION_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE"
]);

let cachedOAuthClient;
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

  cachedService = google.gmail({ version: "v1", auth: getGmailOAuthClient() });
  return cachedService;
}

function getGmailOAuthClient() {
  if (cachedOAuthClient) return cachedOAuthClient;

  const oauth = new google.auth.OAuth2(
    requiredEnvironment("GOOGLE_CLIENT_ID"),
    requiredEnvironment("GOOGLE_CLIENT_SECRET")
  );
  oauth.setCredentials({ refresh_token: requiredEnvironment("GOOGLE_REFRESH_TOKEN") });
  cachedOAuthClient = oauth;
  return cachedOAuthClient;
}

function safeHttpStatus(error) {
  const candidate = error?.response?.status ?? error?.status;
  return Number.isInteger(candidate) && candidate >= 400 && candidate <= 599 ? candidate : undefined;
}

function safeOauthError(error) {
  const candidate = error?.response?.data?.error;
  return typeof candidate === "string" && SAFE_OAUTH_ERRORS.has(candidate) ? candidate : undefined;
}

function safeStoredFailure(details) {
  if (!details || !SAFE_DIAGNOSTIC_CATEGORIES.has(details.category)) return undefined;
  const httpStatus = Number.isInteger(details.httpStatus) && details.httpStatus >= 400 && details.httpStatus <= 599
    ? details.httpStatus
    : undefined;
  const oauthError = typeof details.oauthError === "string" && SAFE_OAUTH_ERRORS.has(details.oauthError)
    ? details.oauthError
    : undefined;
  return {
    category: details.category,
    ...(httpStatus ? { httpStatus } : {}),
    ...(oauthError ? { oauthError } : {})
  };
}

/** Converts provider/network failures into a small, credential-free diagnostic shape. */
export function sanitizeGmailOauthFailure(error) {
  const storedFailure = safeStoredFailure(error?.oauthFailure);
  if (storedFailure) return storedFailure;

  const httpStatus = safeHttpStatus(error);
  if (httpStatus) {
    return {
      category: "google_http_error",
      httpStatus,
      ...(safeOauthError(error) ? { oauthError: safeOauthError(error) } : {})
    };
  }

  const code = typeof error?.code === "string" ? error.code.toUpperCase() : "";
  if (DNS_ERROR_CODES.has(code)) return { category: "dns_error" };
  if (TIMEOUT_ERROR_CODES.has(code)) return { category: "timeout" };
  if (CONNECTION_ERROR_CODES.has(code)) return { category: "connection_error" };
  if (error?.name === "AbortError") return { category: "request_aborted" };
  if (code.startsWith("ERR_TLS_") || code.includes("CERT") || code.includes("TLS")) {
    return { category: "tls_error" };
  }
  return { category: "transport_error" };
}

function refreshFailure(details) {
  const failure = new Error("Gmail OAuth refresh failed");
  failure.oauthFailure = details;
  return failure;
}

/** Refreshes Gmail OAuth credentials without calling any Gmail API method. */
export async function refreshGmailAccessToken(
  oauth = getGmailOAuthClient(),
  { timeoutMs = OAUTH_REFRESH_TIMEOUT_MS } = {}
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const timeoutFailure = new Promise((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(refreshFailure({ category: "timeout" })),
      { once: true }
    );
  });

  try {
    const result = await Promise.race([oauth.getAccessToken(), timeoutFailure]);
    const token = typeof result === "string" ? result : result?.token;
    if (!token) throw refreshFailure({ category: "google_http_error" });
  } catch (error) {
    if (error?.oauthFailure) throw error;
    throw refreshFailure(sanitizeGmailOauthFailure(error));
  } finally {
    clearTimeout(timeout);
  }
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

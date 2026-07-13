import assert from "node:assert/strict";
import test from "node:test";
import { buildRawMessage, sendWithGmailApi } from "../lib/gmail-service.mjs";

test("Gmail service sends URL-safe raw MIME through users.messages.send", async () => {
  let request;
  const gmail = {
    users: {
      messages: {
        send: async (...args) => {
          request = args;
          return { data: { id: "gmail-message-123" } };
        }
      }
    }
  };
  const message = Buffer.from("From: sender@example.com\r\n\r\nBody");
  const id = await sendWithGmailApi(message, gmail);

  assert.equal(id, "gmail-message-123");
  assert.equal(request[0].userId, "me");
  assert.equal(request[0].requestBody.raw, message.toString("base64url"));
  assert.equal(request[1].timeout, 20_000);
});

test("Gmail service exposes no provider or recipient details on failure", async () => {
  const gmail = {
    users: { messages: { send: async () => { throw new Error("secret-token reader@example.com"); } } }
  };
  await assert.rejects(
    sendWithGmailApi(Buffer.from("private"), gmail),
    (error) => error.message === "Gmail API delivery failed"
  );
});

test("compatibility MIME builder remains multipart and deterministic", async () => {
  const message = await buildRawMessage({
    to: "reader@example.com",
    subject: "Test",
    text: "Plain",
    html: "<p>HTML</p>",
    messageKey: "stable-key"
  });
  const source = message.toString();
  assert.match(source, /multipart\/alternative/i);
  assert.match(source, /Message-ID: <89c23917b952649d1bb8297f0dc0abe2@behzadgh\.com>/i);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { normalizeEmail } from "../lib/email-address.mjs";
import { deliverImmediateWelcome } from "../lib/immediate-welcome.mjs";
import { welcomeEmail } from "../scripts/email-templates.mjs";

const record = {
  subscriberId: 12,
  outboxId: 34,
  workerId: "request-worker",
  email: "reader@example.com",
  unsubscribeNonce: "nonce"
};

test("new subscriber SQL is unique, active, and reserves one immediate welcome", () => {
  const source = fs.readFileSync("lib/subscribers.ts", "utf8");
  assert.match(source, /VALUES \(\$1, 'active'/);
  assert.match(source, /ON CONFLICT \(email\) DO NOTHING/);
  assert.match(source, /'welcome', 'welcome:' \|\| id \|\| ':initial', 'sending'/);
  assert.match(source, /outcome: "created"/);
});

test("duplicate active subscriber does not reserve or send another welcome", () => {
  const source = fs.readFileSync("lib/subscribers.ts", "utf8");
  assert.match(source, /existing\.status === "active"/);
  assert.match(source, /outcome: "duplicate_active"/);
  const route = fs.readFileSync("app/api/subscribe/route.ts", "utf8");
  assert.match(route, /result\?\.outcome === "created"/);
  assert.match(route, /result\?\.outcome === "duplicate_active"/);
});

test("welcome is sent immediately and marked delivered", async () => {
  const queries = [];
  let sendCount = 0;
  const result = await deliverImmediateWelcome(record, {
    query: async (text, params) => queries.push({ text, params }),
    deriveEmailToken: () => "A".repeat(43),
    welcomeEmail: (token) => ({ subject: "Welcome.", text: "text", html: "html", unsubscribeUrl: `https://behzadgh.com/unsubscribe/${token}` }),
    buildRawMessage: async (message) => Buffer.from(JSON.stringify(message)),
    sendWithGmailApi: async () => { sendCount += 1; return "gmail-message-id"; }
  });
  assert.equal(result, "sent");
  assert.equal(sendCount, 1);
  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /status = 'sent'/);
  assert.match(queries[0].text, /welcome_sent_at/);
});

test("delivery failure is queued without leaking email or provider details", async () => {
  const queries = [];
  const secretFailure = "sensitive-provider-detail";
  const result = await deliverImmediateWelcome(record, {
    query: async (text, params) => queries.push({ text, params }),
    deriveEmailToken: () => "B".repeat(43),
    welcomeEmail: () => ({ subject: "Welcome.", text: "text", html: "html", unsubscribeUrl: "https://behzadgh.com/unsubscribe/token" }),
    buildRawMessage: async () => Buffer.from("message"),
    sendWithGmailApi: async () => { throw new Error(secretFailure); }
  });
  assert.equal(result, "queued");
  assert.equal(queries.length, 1);
  const persisted = JSON.stringify(queries[0]);
  assert.match(persisted, /retained for retry/);
  assert.doesNotMatch(persisted, /sensitive-provider-detail|reader@example\.com/);
});

test("unsubscribed address requires explicit confirmation", () => {
  const source = fs.readFileSync("lib/subscribers.ts", "utf8");
  assert.match(source, /existing\.status === "unsubscribed"/);
  assert.match(source, /status = 'pending'/);
  assert.match(source, /outcome: "confirmation_required"/);
});

test("email addresses are normalized and invalid values are rejected", () => {
  assert.equal(normalizeEmail(" Reader@Example.COM "), "reader@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail("a..b@example.com"), null);
  assert.equal(normalizeEmail("a@example"), null);
});

test("welcome design preserves exact copy and a secure unsubscribe URL", () => {
  const previous = process.env.SITE_URL;
  process.env.SITE_URL = "https://behzadgh.com";
  try {
    const token = "C".repeat(43);
    const message = welcomeEmail(token);
    const exactCopy = [
      "BEHZAD GHAREHJANLOO",
      "Welcome.",
      "We’re glad to have you with us.",
      "In future emails, we’ll share glimpses behind the scenes, moments of inspiration, and thoughtful reflections.",
      "Your privacy is important to us and will always be protected.",
      "Behzad Gharehjanloo",
      "www.behzadgh.com",
      "We respect your inbox and our privacy.",
      "You can unsubscribe at any time."
    ];
    const visibleHtml = message.html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    for (const copy of exactCopy) {
      assert.ok(message.text.includes(copy), `plain-text copy missing: ${copy}`);
      assert.ok(visibleHtml.includes(copy), `HTML copy missing: ${copy}`);
    }
    assert.equal(message.unsubscribeUrl, `https://behzadgh.com/unsubscribe/${token}`);
    assert.match(message.html, /#bd913d/);
    assert.match(message.html, /#0b1d33/);
    assert.match(message.html, /Georgia/);
    assert.match(message.html, /href="https:\/\/behzadgh\.com"/);
    assert.match(message.html, new RegExp(`href="${message.unsubscribeUrl}"`));
    assert.ok(fs.existsSync("app/unsubscribe/[token]/page.tsx"));
    assert.ok(fs.existsSync("app/api/unsubscribe/[token]/route.ts"));
  } finally {
    if (previous === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = previous;
  }
});

test("subscription API returns only public result codes", () => {
  const route = fs.readFileSync("app/api/subscribe/route.ts", "utf8");
  assert.doesNotMatch(route, /error\.message|console\.|GOOGLE_|DATABASE_URL|EMAIL_TOKEN_SECRET/);
  assert.match(route, /publicResult\("unavailable", 503\)/);
  assert.match(route, /request\.json\(\)/);
  assert.doesNotMatch(route, /KIT_API|convertkit|api\.kit\.com/i);
});

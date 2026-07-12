import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { deriveEmailToken } from "../lib/email-tokens.mjs";

test("Vercel Cron is configured for the secured outbox route", () => {
  const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  assert.deepEqual(config.crons, [{ path: "/api/cron/email-outbox", schedule: "0 3 * * *" }]);
  const route = fs.readFileSync("app/api/cron/email-outbox/route.ts", "utf8");
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /status: 401/);
});

test("production storage uses Postgres and not local SQLite", () => {
  const files = ["package.json", "lib/database.ts", "compose.yaml", ".env.example"]
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  assert.match(files, /@neondatabase\/serverless/);
  assert.match(files, /DATABASE_URL/);
  assert.doesNotMatch(files, /better-sqlite3|DATABASE_PATH|behzad\.sqlite/);
});

test("server secret placeholders remain empty", () => {
  const example = fs.readFileSync(".env.example", "utf8");
  for (const name of ["DATABASE_URL", "ADMIN_PASSWORD_HASH", "EMAIL_TOKEN_SECRET", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "CRON_SECRET"]) {
    assert.match(example, new RegExp(`^${name}=$`, "m"));
  }
  assert.doesNotMatch(example, /NEXT_PUBLIC_(?:GOOGLE|EMAIL|CRON|DATABASE|ADMIN)/);
});

test("email tokens are deterministic, opaque, and purpose separated", () => {
  const previous = process.env.EMAIL_TOKEN_SECRET;
  process.env.EMAIL_TOKEN_SECRET = "A".repeat(43);
  try {
    const confirmation = deriveEmailToken("confirm", "reader@example.com", "nonce");
    const confirmationAgain = deriveEmailToken("confirm", "reader@example.com", "nonce");
    const unsubscribe = deriveEmailToken("unsubscribe", "reader@example.com", "nonce");
    assert.equal(confirmation, confirmationAgain);
    assert.notEqual(confirmation, unsubscribe);
    assert.match(confirmation, /^[A-Za-z0-9_-]{43}$/);
    assert.doesNotMatch(confirmation, /reader|example/i);
  } finally {
    if (previous === undefined) delete process.env.EMAIL_TOKEN_SECRET;
    else process.env.EMAIL_TOKEN_SECRET = previous;
  }
});

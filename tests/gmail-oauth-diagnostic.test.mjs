import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { runGmailOauthDiagnostic } from "../lib/gmail-oauth-diagnostic.mjs";
import { refreshGmailAccessToken, sanitizeGmailOauthFailure } from "../lib/gmail-service.mjs";

const diagnosticSecret = "diagnostic-secret-for-tests";
const productionEnvironment = {
  VERCEL_ENV: "production",
  GMAIL_DIAGNOSTIC_SECRET: diagnosticSecret,
  EMAIL_TOKEN_SECRET: "configured",
  GOOGLE_CLIENT_ID: "configured",
  GOOGLE_CLIENT_SECRET: "configured",
  GOOGLE_REFRESH_TOKEN: "configured"
};

function request(authorization) {
  const headers = authorization ? { authorization } : undefined;
  return new Request("https://www.behzadgh.com/api/admin/diagnostics/gmail-oauth", { headers });
}

test("Gmail OAuth diagnostic rejects missing and invalid authorization", async () => {
  for (const authorization of [undefined, "Bearer incorrect"]) {
    let refreshes = 0;
    const response = await runGmailOauthDiagnostic(request(authorization), {
      environment: productionEnvironment,
      refreshAccessToken: async () => { refreshes += 1; }
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { status: "unauthorized" });
    assert.equal(refreshes, 0);
  }
});

test("Gmail OAuth diagnostic handles a missing server-side diagnostic secret", async () => {
  let refreshes = 0;
  const response = await runGmailOauthDiagnostic(request(`Bearer ${diagnosticSecret}`), {
    environment: { ...productionEnvironment, GMAIL_DIAGNOSTIC_SECRET: "" },
    refreshAccessToken: async () => { refreshes += 1; }
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "unavailable" });
  assert.equal(refreshes, 0);
});

test("Gmail OAuth diagnostic reports a successful refresh with presence booleans only", async () => {
  let refreshes = 0;
  const response = await runGmailOauthDiagnostic(request(`Bearer ${diagnosticSecret}`), {
    environment: productionEnvironment,
    refreshAccessToken: async () => { refreshes += 1; }
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    variables: {
      EMAIL_TOKEN_SECRET: true,
      GOOGLE_CLIENT_ID: true,
      GOOGLE_CLIENT_SECRET: true,
      GOOGLE_REFRESH_TOKEN: true
    },
    oauthRefresh: "succeeded"
  });
  assert.equal(refreshes, 1);
});

test("Gmail OAuth diagnostic sanitizes provider failures", async () => {
  const response = await runGmailOauthDiagnostic(request(`Bearer ${diagnosticSecret}`), {
    environment: productionEnvironment,
    refreshAccessToken: async () => {
      throw new Error("invalid_grant secret-token private@example.com");
    }
  });
  const body = await response.text();
  assert.equal(response.status, 503);
  assert.deepEqual(JSON.parse(body), {
    status: "error",
    variables: {
      EMAIL_TOKEN_SECRET: true,
      GOOGLE_CLIENT_ID: true,
      GOOGLE_CLIENT_SECRET: true,
      GOOGLE_REFRESH_TOKEN: true
    },
    oauthRefresh: "failed",
    error: { category: "transport_error" }
  });
  assert.doesNotMatch(body, /invalid_grant|secret-token|private@example\.com/);
});

test("Gmail OAuth diagnostic reports only a safe Google HTTP status and OAuth error", async () => {
  const response = await runGmailOauthDiagnostic(request(`Bearer ${diagnosticSecret}`), {
    environment: productionEnvironment,
    refreshAccessToken: async () => {
      throw {
        response: {
          status: 400,
          data: {
            error: "invalid_grant",
            error_description: "refresh-token client-secret private@example.com"
          }
        }
      };
    }
  });
  const body = await response.text();
  assert.equal(response.status, 503);
  assert.deepEqual(JSON.parse(body).error, {
    category: "google_http_error",
    httpStatus: 400,
    oauthError: "invalid_grant"
  });
  assert.doesNotMatch(body, /refresh-token|client-secret|private@example\.com/);
});

test("Gmail OAuth refresh has a bounded AbortController timeout", async () => {
  const oauth = { getAccessToken: () => new Promise(() => {}) };
  await assert.rejects(
    refreshGmailAccessToken(oauth, { timeoutMs: 5 }),
    (error) => {
      assert.deepEqual(sanitizeGmailOauthFailure(error), { category: "timeout" });
      return true;
    }
  );
});

test("Gmail OAuth transport failures are categorized without returning messages", () => {
  assert.deepEqual(sanitizeGmailOauthFailure({ code: "ENOTFOUND" }), { category: "dns_error" });
  assert.deepEqual(sanitizeGmailOauthFailure({ code: "ECONNRESET" }), { category: "connection_error" });
  assert.deepEqual(sanitizeGmailOauthFailure({ code: "ERR_TLS_CERT_ALTNAME_INVALID" }), {
    category: "tls_error"
  });
  assert.deepEqual(sanitizeGmailOauthFailure({ name: "AbortError" }), { category: "request_aborted" });
  assert.deepEqual(
    sanitizeGmailOauthFailure({
      oauthFailure: { category: "attacker-controlled", token: "secret-token" }
    }),
    { category: "transport_error" }
  );
});

test("Gmail OAuth diagnostic sends no email and performs no database writes", async () => {
  let sends = 0;
  let writes = 0;
  const response = await runGmailOauthDiagnostic(request(`Bearer ${diagnosticSecret}`), {
    environment: productionEnvironment,
    refreshAccessToken: async () => {},
    sendEmail: async () => { sends += 1; },
    writeDatabase: async () => { writes += 1; }
  });
  assert.equal(response.status, 200);
  assert.equal(sends, 0);
  assert.equal(writes, 0);

  const implementation = fs.readFileSync("lib/gmail-oauth-diagnostic.mjs", "utf8");
  const route = fs.readFileSync("app/api/admin/diagnostics/gmail-oauth/route.ts", "utf8");
  assert.doesNotMatch(implementation + route, /database|subscriber|outbox|messages\.send|sendWithGmailApi/);
});

test("Gmail OAuth diagnostic is unavailable outside Production", async () => {
  let refreshes = 0;
  const response = await runGmailOauthDiagnostic(request(`Bearer ${diagnosticSecret}`), {
    environment: { ...productionEnvironment, VERCEL_ENV: "preview" },
    refreshAccessToken: async () => { refreshes += 1; }
  });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { status: "not_found" });
  assert.equal(refreshes, 0);
});

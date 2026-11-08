"use client";

import { useRef, useState } from "react";

export function AdminGmailDiagnostic() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  async function check() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/admin/diagnostics/gmail-oauth", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Admin-Diagnostic": "gmail-oauth" },
        body: "{}"
      });
      const value = await response.json();
      const message = response.ok && value.status === "ok" && value.oauthRefresh === "succeeded"
        ? "OAuth refresh succeeded. No email was sent. This does not verify inbox delivery or sender permissions."
        : response.status === 401 ? "Your Admin session is unavailable or expired. Sign in again."
        : response.status === 404 ? "This diagnostic runs only in the production deployment. No OAuth check was performed."
        : "The connection check did not succeed. Review the sanitized diagnostic result; no email was sent.";
      const safe: Record<string, unknown> = {};
      if (typeof value.timestamp === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value.timestamp)) safe.timestamp = value.timestamp;
      if (["succeeded", "failed", "not_attempted"].includes(value.oauthRefresh)) safe.oauthRefresh = value.oauthRefresh;
      if (value.variables) {
        safe.configuration = Object.fromEntries(["EMAIL_TOKEN_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"].filter(key => typeof value.variables[key] === "boolean").map(key => [key, value.variables[key]]));
      }
      if (["connection_error", "dns_error", "google_http_error", "request_aborted", "timeout", "tls_error", "transport_error"].includes(value.error?.category)) safe.errorCategory = value.error.category;
      setResult(`${message}${Object.keys(safe).length ? `\n\n${JSON.stringify(safe, null, 2)}` : ""}`);
    } catch {
      setResult("The diagnostic could not be completed. No automatic retry was made.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="mt-8 max-w-2xl border-t border-line pt-6" aria-labelledby="gmail-diagnostic-heading">
    <h2 id="gmail-diagnostic-heading" className="font-serif text-2xl">Gmail connection</h2>
    <p className="mt-3 text-sm leading-6 text-muted">Check the existing OAuth configuration without sending an email or changing subscriber records.</p>
    <button type="button" onClick={check} disabled={busy} className="mt-5 min-h-11 border border-[#b49a68] px-5 py-2 text-sm font-semibold hover:bg-[#f2e8d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8b692f] disabled:opacity-60">
      {busy ? "Checking connection…" : "Check Gmail Connection"}
    </button>
    <p role="status" aria-live="polite" className="mt-5 whitespace-pre-wrap break-words text-sm leading-6">{result}</p>
  </section>;
}

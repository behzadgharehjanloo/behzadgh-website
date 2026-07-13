import { timingSafeEqual } from "node:crypto";
import { refreshGmailAccessToken, sanitizeGmailOauthFailure } from "./gmail-service.mjs";

const REQUIRED_VARIABLES = [
  "EMAIL_TOKEN_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN"
];

const noStore = { "Cache-Control": "no-store" };

function bearerAuthorized(request, secret) {
  const provided = request.headers.get("authorization");
  if (!provided) return false;

  const expectedBuffer = Buffer.from(`Bearer ${secret}`);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function variablePresence(environment) {
  return Object.fromEntries(REQUIRED_VARIABLES.map((name) => [name, Boolean(environment[name])]));
}

export async function runGmailOauthDiagnostic(
  request,
  { environment = process.env, refreshAccessToken = refreshGmailAccessToken } = {}
) {
  if (environment.VERCEL_ENV !== "production") {
    return Response.json({ status: "not_found" }, { status: 404, headers: noStore });
  }

  const diagnosticSecret = environment.GMAIL_DIAGNOSTIC_SECRET;
  if (!diagnosticSecret) {
    return Response.json({ status: "unavailable" }, { status: 503, headers: noStore });
  }

  if (!bearerAuthorized(request, diagnosticSecret)) {
    return Response.json({ status: "unauthorized" }, { status: 401, headers: noStore });
  }

  const variables = variablePresence(environment);
  if (Object.values(variables).some((present) => !present)) {
    return Response.json(
      { status: "unavailable", variables, oauthRefresh: "not_attempted" },
      { status: 503, headers: noStore }
    );
  }

  try {
    await refreshAccessToken();
    return Response.json(
      { status: "ok", variables, oauthRefresh: "succeeded" },
      { headers: noStore }
    );
  } catch (error) {
    return Response.json(
      {
        status: "error",
        variables,
        oauthRefresh: "failed",
        error: sanitizeGmailOauthFailure(error)
      },
      { status: 503, headers: noStore }
    );
  }
}

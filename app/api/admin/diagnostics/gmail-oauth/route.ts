import { runGmailOauthDiagnostic, runAuthorizedGmailOauthDiagnostic } from "@/lib/gmail-oauth-diagnostic.mjs";
import { isAdminAuthenticatedReadOnly } from "@/lib/auth";
import { isSameOriginPost } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return runGmailOauthDiagnostic(request);
}

export async function POST(request: Request) {
  const fail = (status: number, state: string) => Response.json(
    { status: state, timestamp: new Date().toISOString() },
    { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } }
  );
  // Custom header requires a CORS preflight; exact Origin validation also rejects
  // missing/null origins, foreign subdomains and cross-site Fetch Metadata.
  if (new URL(request.url).search || !isSameOriginPost(request)
      || request.headers.get("x-admin-diagnostic") !== "gmail-oauth"
      || request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return fail(403, "forbidden");
  }
  try {
    if (!(await isAdminAuthenticatedReadOnly())) return fail(401, "unauthorized");
  } catch {
    return fail(503, "unavailable");
  }
  return runAuthorizedGmailOauthDiagnostic();
}

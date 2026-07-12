import { isSameOriginPost, requestClientKey } from "@/lib/request-security";
import { normalizeEmail, subscribe } from "@/lib/subscribers";
import { subscriptionAllowed } from "@/lib/subscription-rate-limit";
import { deliverImmediateWelcome } from "@/lib/immediate-welcome.mjs";
import { query } from "@/lib/database";

export const runtime = "nodejs";
export const maxDuration = 60;

function redirectTo(request: Request, result: string) {
  return Response.redirect(new URL(`/subscribe?result=${result}`, request.url), 303);
}

export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return new Response("Forbidden", { status: 403 });
  if (!(await subscriptionAllowed(requestClientKey(request)))) return redirectTo(request, "limited");

  const form = await request.formData();
  if (form.get("website")) return redirectTo(request, "unavailable");

  const value = form.get("email");
  const email = typeof value === "string" ? normalizeEmail(value) : null;
  if (!email) return redirectTo(request, "invalid");

  try {
    const result = await subscribe(email);
    if (result?.outcome === "created") {
      await deliverImmediateWelcome(result, { query });
      return redirectTo(request, "saved");
    }
    if (result?.outcome === "duplicate_active") return redirectTo(request, "existing");
    if (result?.outcome === "confirmation_required") return redirectTo(request, "confirm");
    return redirectTo(request, "unavailable");
  } catch {
    return redirectTo(request, "unavailable");
  }
}

import { isSameOriginPost, requestClientKey } from "@/lib/request-security";
import { normalizeEmail, subscribe } from "@/lib/subscribers";
import { subscriptionAllowed } from "@/lib/subscription-rate-limit";

export const runtime = "nodejs";

function redirectTo(request: Request, result: string) {
  return Response.redirect(new URL(`/subscribe?result=${result}`, request.url), 303);
}

export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return new Response("Forbidden", { status: 403 });
  if (!subscriptionAllowed(requestClientKey(request))) return redirectTo(request, "limited");

  const form = await request.formData();
  if (form.get("website")) return redirectTo(request, "saved");

  const value = form.get("email");
  const email = typeof value === "string" ? normalizeEmail(value) : null;
  if (!email) return redirectTo(request, "invalid");

  try {
    subscribe(email);
  } catch {
    return redirectTo(request, "unavailable");
  }
  return redirectTo(request, "saved");
}

import { NextResponse } from "next/server";
import { query } from "@/lib/database";
import { deliverImmediateWelcome } from "@/lib/immediate-welcome.mjs";
import { isSameOriginPost, requestClientKey } from "@/lib/request-security";
import { normalizeEmail, subscribe } from "@/lib/subscribers";
import { subscriptionAllowed } from "@/lib/subscription-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

function publicResult(outcome: string, status = 200) {
  return NextResponse.json({ ok: status < 400, outcome }, { status });
}

export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return publicResult("forbidden", 403);
  if (!(await subscriptionAllowed(requestClientKey(request)))) return publicResult("limited", 429);

  let value: unknown;
  try {
    const body = (await request.json()) as { email?: unknown };
    value = body.email;
  } catch {
    return publicResult("invalid", 400);
  }

  const email = typeof value === "string" ? normalizeEmail(value) : null;
  if (!email) return publicResult("invalid", 400);

  try {
    const result = await subscribe(email);
    if (result?.outcome === "created") {
      const delivery = await deliverImmediateWelcome(result, { query });
      return NextResponse.json({ ok: true, outcome: "created", delivery });
    }
    if (result?.outcome === "duplicate_active") return publicResult("duplicate_active");
    if (result?.outcome === "confirmation_required") return publicResult("confirmation_required", 202);
    return publicResult("unavailable", 503);
  } catch {
    return publicResult("unavailable", 503);
  }
}

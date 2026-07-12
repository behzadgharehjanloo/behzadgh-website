import { clearAdminSession } from "@/lib/auth";
import { isSameOriginPost } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginPost(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  await clearAdminSession();
  return Response.redirect(new URL("/admin/login", request.url), 303);
}

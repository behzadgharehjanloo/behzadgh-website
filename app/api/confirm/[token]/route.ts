import { isSameOriginPost } from "@/lib/request-security";
import { confirmByToken } from "@/lib/subscribers";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!isSameOriginPost(request)) return new Response("Forbidden", { status: 403 });
  const { token } = await params;
  const confirmed = confirmByToken(token);
  const result = confirmed ? "1" : "0";
  return Response.redirect(new URL(`/confirm/${encodeURIComponent(token)}?confirmed=${result}`, request.url), 303);
}

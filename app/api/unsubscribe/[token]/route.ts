import { isSameOriginPost } from "@/lib/request-security";
import { unsubscribeByToken } from "@/lib/subscribers";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await request.formData();
  const browserConfirmation = form.get("confirm") === "1" && isSameOriginPost(request);
  const oneClick = form.get("List-Unsubscribe") === "One-Click";

  if (!browserConfirmation && !oneClick) return new Response("Forbidden", { status: 403 });
  unsubscribeByToken(token);

  if (oneClick) return new Response(null, { status: 204 });
  return Response.redirect(new URL(`/unsubscribe/${encodeURIComponent(token)}`, request.url), 303);
}

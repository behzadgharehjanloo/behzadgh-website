import {
  clearLoginAttempts,
  createAdminSession,
  isLoginBlocked,
  isSameOriginPost,
  loginClientKey,
  recordFailedLogin,
  setAdminSessionCookie,
  verifyAdminPassword
} from "@/lib/auth";

export const runtime = "nodejs";

function redirectTo(request: Request, path: string) {
  return Response.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  if (!isSameOriginPost(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!process.env.ADMIN_PASSWORD_HASH) return redirectTo(request, "/admin/login?error=configuration");

  const clientKey = loginClientKey(request);
  if (isLoginBlocked(clientKey)) return redirectTo(request, "/admin/login?error=invalid");

  const form = await request.formData();
  const password = form.get("password");
  if (typeof password !== "string" || password.length > 1024 || !verifyAdminPassword(password)) {
    recordFailedLogin(clientKey);
    return redirectTo(request, "/admin/login?error=invalid");
  }

  clearLoginAttempts(clientKey);
  await setAdminSessionCookie(createAdminSession());
  return redirectTo(request, "/admin");
}

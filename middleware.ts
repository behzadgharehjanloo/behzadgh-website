import { NextResponse } from "next/server";

// Private diagnostic headers only. No authentication or data access here.
export function middleware() {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "same-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
export const config = { matcher: ["/admin/diagnostics/:path*", "/api/admin/diagnostics/:path*"] };

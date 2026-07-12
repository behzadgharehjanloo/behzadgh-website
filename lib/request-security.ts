import { createHash } from "node:crypto";

export function requestClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return createHash("sha256").update(`${forwarded}\n${userAgent}`).digest("hex");
}

export function isSameOriginPost(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  try {
    const originUrl = new URL(origin);
    const expectedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
      ?? request.headers.get("host");
    const expectedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
      ?? new URL(request.url).protocol.replace(":", "");
    return Boolean(expectedHost && originUrl.host === expectedHost && originUrl.protocol === `${expectedProtocol}:`);
  } catch {
    return false;
  }
}

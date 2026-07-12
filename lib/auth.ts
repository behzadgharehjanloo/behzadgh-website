import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/database";

const SESSION_TTL_SECONDS = 12 * 60 * 60;
const SESSION_COOKIE = process.env.AUTH_COOKIE_SECURE === "false" ? "admin_session" : "__Host-admin_session";

type PasswordHash = {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
};

function parsePasswordHash(value: string): PasswordHash | null {
  const [algorithm, n, r, p, salt, hash] = value.split(":");
  if (algorithm !== "scrypt" || !n || !r || !p || !salt || !hash) return null;

  const parsed = {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    salt: Buffer.from(salt, "base64url"),
    hash: Buffer.from(hash, "base64url")
  };

  if (parsed.N !== 32768 || parsed.r !== 8 || parsed.p !== 1 || parsed.salt.length !== 16 || parsed.hash.length !== 32) {
    return null;
  }

  return parsed;
}

export function verifyAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD_HASH;
  if (!configured) return false;

  const parsed = parsePasswordHash(configured);
  if (!parsed) return false;

  const candidate = scryptSync(password, parsed.salt, parsed.hash.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: 64 * 1024 * 1024
  });

  return timingSafeEqual(candidate, parsed.hash);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAdminSession() {
  const token = randomBytes(32).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const database = getDatabase();
  database.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now);
  database.prepare(
    "INSERT INTO admin_sessions (token_hash, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?)"
  ).run(hashToken(token), now, now + SESSION_TTL_SECONDS, now);
  return token;
}

export async function setAdminSessionCookie(token: string) {
  const secure = process.env.AUTH_COOKIE_SECURE !== "false";
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    getDatabase().prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(hashToken(token));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAdminAuthenticated() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const now = Math.floor(Date.now() / 1000);
  const database = getDatabase();
  const session = database.prepare(
    "SELECT expires_at FROM admin_sessions WHERE token_hash = ?"
  ).get(hashToken(token)) as { expires_at: number } | undefined;

  if (!session || session.expires_at <= now) {
    if (session) database.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").run(hashToken(token));
    return false;
  }

  database.prepare("UPDATE admin_sessions SET last_seen_at = ? WHERE token_hash = ?").run(now, hashToken(token));
  return true;
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export function loginClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return createHash("sha256").update(`${forwarded}\n${userAgent}`).digest("hex");
}

export function isLoginBlocked(clientKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const row = getDatabase().prepare(
    "SELECT blocked_until FROM admin_login_attempts WHERE client_key = ?"
  ).get(clientKey) as { blocked_until: number | null } | undefined;
  return Boolean(row?.blocked_until && row.blocked_until > now);
}

export function recordFailedLogin(clientKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = 15 * 60;
  const database = getDatabase();
  database.prepare("DELETE FROM admin_login_attempts WHERE window_started_at <= ?").run(now - 24 * 60 * 60);
  const row = database.prepare(
    "SELECT window_started_at, attempts FROM admin_login_attempts WHERE client_key = ?"
  ).get(clientKey) as { window_started_at: number; attempts: number } | undefined;

  if (!row || row.window_started_at <= now - windowSeconds) {
    database.prepare(
      "INSERT INTO admin_login_attempts (client_key, window_started_at, attempts, blocked_until) VALUES (?, ?, 1, NULL) ON CONFLICT(client_key) DO UPDATE SET window_started_at = excluded.window_started_at, attempts = 1, blocked_until = NULL"
    ).run(clientKey, now);
    return;
  }

  const attempts = row.attempts + 1;
  database.prepare(
    "UPDATE admin_login_attempts SET attempts = ?, blocked_until = ? WHERE client_key = ?"
  ).run(attempts, attempts >= 5 ? now + windowSeconds : null, clientKey);
}

export function clearLoginAttempts(clientKey: string) {
  getDatabase().prepare("DELETE FROM admin_login_attempts WHERE client_key = ?").run(clientKey);
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

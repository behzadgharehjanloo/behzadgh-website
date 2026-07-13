import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/database";
import { requestClientKey } from "@/lib/request-security";

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

export async function createAdminSession() {
  const token = randomBytes(32).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  await query("DELETE FROM admin_sessions WHERE expires_at <= $1", [now]);
  await query(
    "INSERT INTO admin_sessions (token_hash, created_at, expires_at, last_seen_at) VALUES ($1, $2, $3, $4)",
    [hashToken(token), now, now + SESSION_TTL_SECONDS, now]
  );
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
    await query("DELETE FROM admin_sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAdminAuthenticated() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const now = Math.floor(Date.now() / 1000);
  const sessions = await query<{ expires_at: string | number }>(
    "SELECT expires_at FROM admin_sessions WHERE token_hash = $1",
    [hashToken(token)]
  );
  const session = sessions[0];

  if (!session || Number(session.expires_at) <= now) {
    if (session) await query("DELETE FROM admin_sessions WHERE token_hash = $1", [hashToken(token)]);
    return false;
  }

  await query("UPDATE admin_sessions SET last_seen_at = $1 WHERE token_hash = $2", [now, hashToken(token)]);
  return true;
}

export async function requireAdmin() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
}

export function loginClientKey(request: Request) {
  return requestClientKey(request);
}

export async function isLoginBlocked(clientKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const rows = await query<{ blocked_until: string | number | null }>(
    "SELECT blocked_until FROM admin_login_attempts WHERE client_key = $1",
    [clientKey]
  );
  return Boolean(rows[0]?.blocked_until && Number(rows[0].blocked_until) > now);
}

export async function recordFailedLogin(clientKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = 15 * 60;
  await query("DELETE FROM admin_login_attempts WHERE window_started_at <= $1", [now - 24 * 60 * 60]);
  await query(
    `INSERT INTO admin_login_attempts (client_key, window_started_at, attempts, blocked_until)
     VALUES ($1, $2, 1, NULL)
     ON CONFLICT (client_key) DO UPDATE SET
       attempts = CASE WHEN admin_login_attempts.window_started_at <= $3 THEN 1 ELSE admin_login_attempts.attempts + 1 END,
       window_started_at = CASE WHEN admin_login_attempts.window_started_at <= $3 THEN $2 ELSE admin_login_attempts.window_started_at END,
       blocked_until = CASE
         WHEN admin_login_attempts.window_started_at <= $3 THEN NULL
         WHEN admin_login_attempts.attempts + 1 >= 5 THEN $4
         ELSE admin_login_attempts.blocked_until
       END`,
    [clientKey, now, now - windowSeconds, now + windowSeconds]
  );
}

export async function clearLoginAttempts(clientKey: string) {
  await query("DELETE FROM admin_login_attempts WHERE client_key = $1", [clientKey]);
}

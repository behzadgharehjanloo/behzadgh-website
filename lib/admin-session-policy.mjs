const SESSION_TTL_SECONDS = 12 * 60 * 60;

export function adminCookiePolicy(environment = process.env) {
  const production = environment.NODE_ENV === "production";
  const secure = production || environment.AUTH_COOKIE_SECURE !== "false";
  return {
    name: secure ? "__Host-admin_session" : "admin_session",
    options: {
      httpOnly: true,
      secure,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_TTL_SECONDS
    }
  };
}

export function adminSessionIsValid(expiresAt, now = Math.floor(Date.now() / 1000)) {
  return Number.isFinite(Number(expiresAt)) && Number(expiresAt) > now;
}

export { SESSION_TTL_SECONDS };

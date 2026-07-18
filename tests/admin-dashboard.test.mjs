import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  ADMIN_PAGE_SIZE,
  csvEscape,
  loadAdminDashboard,
  normalizeSubscriberSummary,
  parseAdminFilters,
  subscriberWhere,
  subscribersToCsv
} from "../lib/admin-dashboard.mjs";
import { adminCookiePolicy, adminSessionIsValid } from "../lib/admin-session-policy.mjs";

test("unauthenticated admin access is redirected server-side", () => {
  const layout = fs.readFileSync("app/admin/(protected)/layout.tsx", "utf8");
  const page = fs.readFileSync("app/admin/(protected)/page.tsx", "utf8");
  const auth = fs.readFileSync("lib/auth.ts", "utf8");
  assert.match(layout, /await requireAdmin\(\)/);
  assert.ok(page.indexOf("await requireAdmin()") < page.indexOf("const dashboard = await loadAdminDashboard("));
  assert.match(auth, /redirect\("\/admin\/login"\)/);
  assert.doesNotMatch(layout, /useEffect|localStorage|sessionStorage/);
});

test("authenticated dashboard uses the existing server session", () => {
  const page = fs.readFileSync("app/admin/(protected)/page.tsx", "utf8");
  const login = fs.readFileSync("app/api/admin/login/route.ts", "utf8");
  assert.match(page, /loadAdminDashboard/);
  assert.match(login, /createAdminSession/);
  assert.match(login, /setAdminSessionCookie/);
  assert.doesNotMatch(page, /ADMIN_PASSWORD_HASH|sessionStorage|localStorage/);
});

test("admin cookies remain HttpOnly, strict, and secure in Production", () => {
  const production = adminCookiePolicy({ NODE_ENV: "production", AUTH_COOKIE_SECURE: "false" });
  assert.equal(production.name, "__Host-admin_session");
  assert.deepEqual(production.options, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 43_200
  });
  const local = adminCookiePolicy({ NODE_ENV: "development", AUTH_COOKIE_SECURE: "false" });
  assert.equal(local.options.secure, false);
});

test("invalid and expired sessions are rejected", () => {
  assert.equal(adminSessionIsValid(null, 100), false);
  assert.equal(adminSessionIsValid("not-a-time", 100), false);
  assert.equal(adminSessionIsValid(100, 100), false);
  assert.equal(adminSessionIsValid(101, 100), true);
  const auth = fs.readFileSync("lib/auth.ts", "utf8");
  assert.match(auth, /adminSessionIsValid/);
  assert.match(auth, /DELETE FROM admin_sessions/);
});

test("subscriber summary calculations normalize database aggregate values", () => {
  assert.deepEqual(
    normalizeSubscriberSummary(
      { total: "12", active: 8, pending: 1, unsubscribed: 2, suppressed: 1, today: 3, last_7_days: 6, this_month: 9, welcome_sent: 7 },
      { welcome_outstanding: "2" }
    ),
    { total: 12, active: 8, pending: 1, unsubscribed: 2, suppressed: 1, today: 3, last7Days: 6, thisMonth: 9, welcomeSent: 7, welcomeOutstanding: 2 }
  );
});

test("dashboard pagination clamps pages and never loads the full subscriber table", async () => {
  const calls = [];
  const query = async (text, params = []) => {
    calls.push({ text, params });
    if (/last_7_days/.test(text)) return [{ total: 60 }];
    if (/welcome_outstanding/.test(text)) return [{ welcome_outstanding: 0 }];
    if (/COUNT\(\*\)::int AS count FROM subscribers s/.test(text)) return [{ count: 60 }];
    if (/WITH days AS/.test(text)) return [{ day: "2026-07-18", count: 2 }];
    if (/SELECT s\.id, s\.email/.test(text)) return [];
    throw new Error("Unexpected query");
  };
  const result = await loadAdminDashboard(query, { page: 2, search: "", status: "all" });
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 3);
  const subscriberQuery = calls.find((call) => /SELECT s\.id, s\.email/.test(call.text));
  assert.ok(subscriberQuery);
  assert.match(subscriberQuery.text, /LIMIT \$1 OFFSET \$2/);
  assert.deepEqual(subscriberQuery.params, [ADMIN_PAGE_SIZE, ADMIN_PAGE_SIZE]);
});

test("email search and status filtering are normalized and parameterized", () => {
  const filters = parseAdminFilters({ page: "-4", search: " Reader%_ ", status: "active" });
  assert.deepEqual(filters, { page: 1, search: "reader%_", status: "active" });
  const where = subscriberWhere(filters);
  assert.match(where.sql, /LOWER\(s\.email\) LIKE \$1/);
  assert.match(where.sql, /s\.status = \$2/);
  assert.deepEqual(where.params, ["reader\\%\\_%", "active"]);
  assert.doesNotMatch(where.sql, /reader/);
  assert.equal(parseAdminFilters({ status: "unknown" }).status, "all");
});

test("CSV export is authenticated before subscriber data is queried", () => {
  const route = fs.readFileSync("app/api/admin/subscribers.csv/route.ts", "utf8");
  const authIndex = route.indexOf("if (!(await isAdminAuthenticated()))");
  const queryIndex = route.indexOf("const rows = await loadAdminCsvRows");
  assert.ok(authIndex >= 0 && queryIndex >= 0 && authIndex < queryIndex);
  assert.match(route, /status: 401/);
  assert.match(route, /private, no-store/);
});

test("CSV values are escaped and spreadsheet formulas are neutralized", () => {
  assert.equal(csvEscape('a"b'), '"a""b"');
  assert.equal(csvEscape("=IMPORTDATA('x')"), '"\'=IMPORTDATA(\'x\')"');
  const csv = subscribersToCsv([{
    email: "reader@example.com",
    status: "active",
    created_at: 0,
    consent_source: "website, form",
    welcome_sent_at: null,
    unsubscribed_at: null
  }]);
  assert.match(csv, /^"email","status","signup date","source","welcome sent date","unsubscribed date"\r\n/);
  assert.match(csv, /"website, form"/);
  assert.doesNotMatch(csv, /undefined|null/);
});

test("logout clears the server session and login remains rate limited", () => {
  const logout = fs.readFileSync("app/api/admin/logout/route.ts", "utf8");
  const login = fs.readFileSync("app/api/admin/login/route.ts", "utf8");
  const auth = fs.readFileSync("lib/auth.ts", "utf8");
  assert.match(logout, /clearAdminSession/);
  assert.match(logout, /isSameOriginPost/);
  assert.match(login, /isLoginBlocked/);
  assert.match(login, /recordFailedLogin/);
  assert.match(auth, /attempts \+ 1 >= 5/);
});

test("subscriber details are not exposed by public JSON routes or navigation", () => {
  const subscribe = fs.readFileSync("app/api/subscribe/route.ts", "utf8");
  const header = fs.readFileSync("components/Header.tsx", "utf8");
  assert.doesNotMatch(subscribe, /NextResponse\.json\([^\n]*(?:email|subscriberId|outboxId|welcome_sent_at)/);
  assert.doesNotMatch(header, /\/admin|Admin/);
  assert.match(fs.readFileSync("app/admin/(protected)/layout.tsx", "utf8"), /requireAdmin/);
});

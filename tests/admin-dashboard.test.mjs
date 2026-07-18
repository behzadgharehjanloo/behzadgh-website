import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { ADMIN_TIME_ZONE, formatAdminDate } from "../lib/admin-date-format.mjs";
import {
  ADMIN_PAGE_SIZE,
  buildAudienceSnapshot,
  buildGrowthSeries,
  calculateMilestones,
  calculateSourceShares,
  chooseGrowthRange,
  comparePeriods,
  csvEscape,
  loadAdminDashboard,
  normalizeDeliveryHealth,
  normalizeOverview,
  normalizeRecentActivity,
  parseAdminFilters,
  safePercent,
  subscriberWhere,
  subscribersToCsv
} from "../lib/admin-dashboard.mjs";
import { adminCookiePolicy, adminSessionIsValid } from "../lib/admin-session-policy.mjs";

const dashboardPage = () => fs.readFileSync("app/admin/(protected)/page.tsx", "utf8");

test("admin dates use New York time with automatic daylight-saving abbreviations", () => {
  assert.equal(ADMIN_TIME_ZONE, "America/New_York");
  assert.equal(
    formatAdminDate(Date.UTC(2026, 6, 18, 16, 38) / 1000),
    "Jul 18, 2026 · 12:38 PM EDT"
  );
  assert.equal(
    formatAdminDate(Date.UTC(2026, 0, 18, 17, 38) / 1000),
    "Jan 18, 2026 · 12:38 PM EST"
  );
  assert.equal(formatAdminDate(null), "—");
  assert.equal(formatAdminDate("invalid"), "—");
});

test("unauthenticated admin access is redirected server-side before analytics load", () => {
  const layout = fs.readFileSync("app/admin/(protected)/layout.tsx", "utf8");
  const page = dashboardPage();
  const auth = fs.readFileSync("lib/auth.ts", "utf8");
  assert.match(layout, /await requireAdmin\(\)/);
  assert.ok(page.indexOf("await requireAdmin()") < page.indexOf("const dashboard = await loadAdminDashboard("));
  assert.match(auth, /redirect\("\/admin\/login"\)/);
  assert.doesNotMatch(layout, /useEffect|localStorage|sessionStorage/);
});

test("authenticated analytics reuse the existing server session", () => {
  const page = dashboardPage();
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
  assert.equal(adminCookiePolicy({ NODE_ENV: "development", AUTH_COOKIE_SECURE: "false" }).options.secure, false);
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

test("overview calculations preserve exact counts and meaningful rates", () => {
  const overview = normalizeOverview({
    total: "20",
    active: 16,
    pending: 1,
    unsubscribed: 3,
    suppressed: 0,
    today: 2,
    current_7: 7,
    previous_7: 4,
    this_month: 9,
    previous_month: 6,
    net_this_month: 6,
    net_previous_month: 4,
    net_30_days: 8,
    net_90_days: 12,
    active_at_month_start: 10,
    first_subscriber_at: 0,
    last_subscriber_at: 100,
    generated_at: 8_640_000
  }, { welcome_sent: 18, welcome_total: 20 });
  assert.equal(overview.total, 20);
  assert.equal(overview.netThisMonth, 6);
  assert.equal(overview.growthRateThisMonth, 60);
  assert.equal(overview.welcomeDeliveryRate, 90);
  assert.equal(overview.unsubscribeRate, 15);
  assert.equal(overview.trackingDays, 100);
});

test("zero denominators never produce misleading percentages", () => {
  assert.equal(safePercent(1, 0), null);
  assert.equal(safePercent(0, 0), null);
  assert.equal(comparePeriods(3, 0).percentChange, null);
  const overview = normalizeOverview({ net_this_month: 1, active_at_month_start: 0 }, { welcome_sent: 0, welcome_total: 0 });
  assert.equal(overview.growthRateThisMonth, null);
  assert.equal(overview.welcomeDeliveryRate, null);
  assert.equal(overview.unsubscribeRate, null);
});

test("7, 30, 90, and all-time ranges are accepted and low data defaults to 7 days", () => {
  for (const range of ["7", "30", "90", "all"]) assert.equal(parseAdminFilters({ range }).range, range);
  assert.equal(parseAdminFilters({ range: "365" }).range, "auto");
  assert.equal(chooseGrowthRange("auto", { total: 1, trackingDays: 30 }), "7");
  assert.equal(chooseGrowthRange("auto", { total: 5, trackingDays: 20 }), "30");
  assert.equal(chooseGrowthRange("90", { total: 1, trackingDays: 1 }), "90");
});

test("cumulative active growth accounts for activations and unsubscribes", () => {
  assert.deepEqual(buildGrowthSeries([
    { day: "2026-07-16", signups: 2, activations: 2, unsubscribes: 0 },
    { day: "2026-07-17", signups: 1, activations: 1, unsubscribes: 1 },
    { day: "2026-07-18", signups: 0, activations: 0, unsubscribes: 2 }
  ], 5), [
    { day: "2026-07-16", signups: 2, active: 7 },
    { day: "2026-07-17", signups: 1, active: 7 },
    { day: "2026-07-18", signups: 0, active: 5 }
  ]);
});

test("current and previous period comparisons preserve count and percentage change", () => {
  assert.deepEqual(comparePeriods(12, 8), { current: 12, previous: 8, change: 4, percentChange: 50 });
  assert.deepEqual(comparePeriods(2, 4), { current: 2, previous: 4, change: -2, percentChange: -50 });
});

test("acquisition sources are aggregated into honest shares", () => {
  assert.deepEqual(calculateSourceShares([
    { source: "website-subscribe-form", count: 3 },
    { source: "imported", count: 1 }
  ]), [
    { source: "website-subscribe-form", count: 3, share: 75 },
    { source: "imported", count: 1, share: 25 }
  ]);
  assert.deepEqual(calculateSourceShares([{ source: "website-subscribe-form", count: 1 }])[0].share, 100);
});

test("delivery health distinguishes sent, pending, and failed items", () => {
  assert.deepEqual(normalizeDeliveryHealth({
    welcome_sent: "8",
    welcome_queued: 1,
    welcome_failed: 1,
    welcome_total: 10,
    most_recent_sent_at: 100,
    most_recent_failure_at: 90
  }), {
    sent: 8,
    queued: 1,
    failed: 1,
    total: 10,
    deliveryRate: 80,
    mostRecentSentAt: 100,
    mostRecentFailureAt: 90,
    databaseStatus: "healthy",
    gmailStatus: "needs_attention",
    queueStatus: "failed"
  });
});

test("recent activity is ordered newest first", () => {
  const activity = normalizeRecentActivity([
    { event_type: "subscriber_joined", email: "early@example.com", occurred_at: 100 },
    { event_type: "welcome_sent", email: "new@example.com", occurred_at: 300 },
    { event_type: "subscriber_unsubscribed", email: "middle@example.com", occurred_at: 200 }
  ]);
  assert.deepEqual(activity.map((item) => item.occurredAt), [300, 200, 100]);
});

test("milestones require actual underlying subscriber positions", () => {
  const result = calculateMilestones(12, [
    { milestone: 1, achieved_at: 100 },
    { milestone: 10, achieved_at: 200 }
  ]);
  assert.equal(result.milestones[0].achieved, true);
  assert.equal(result.milestones[1].achievedAt, 200);
  assert.equal(result.next.target, 25);
  assert.equal(result.progress, 48);
  assert.equal(calculateMilestones(10, [{ milestone: 1, achieved_at: 100 }]).milestones[1].achieved, false);
});

test("audience snapshot withholds monthly averages until enough history exists", () => {
  const delivery = normalizeDeliveryHealth({ welcome_sent: 1, welcome_total: 1 });
  const base = normalizeOverview({ active: 1, net_30_days: 1, net_90_days: 1, first_subscriber_at: 0, generated_at: 864_000 }, { welcome_sent: 1, welcome_total: 1 });
  assert.equal(buildAudienceSnapshot(base, [{ source: "website-subscribe-form", count: 1, share: 100 }], delivery).averageMonthlyNetGrowth, null);
  const mature = { ...base, trackingDays: 90, net90Days: 9 };
  assert.equal(buildAudienceSnapshot(mature, [], delivery).averageMonthlyNetGrowth, 3);
});

test("dashboard pagination is server-side and never loads the full subscriber table", async () => {
  const calls = [];
  const query = async (text, params = []) => {
    calls.push({ text, params });
    if (/active_at_month_start/.test(text)) return [{ total: 60, active: 50, first_subscriber_at: 0, generated_at: 8_640_000 }];
    if (/welcome_queued/.test(text)) return [{ welcome_sent: 50, welcome_total: 55 }];
    if (/GROUP BY consent_source/.test(text)) return [{ source: "website-subscribe-form", count: 60 }];
    if (/SELECT event_type/.test(text)) return [];
    if (/ROW_NUMBER\(\) OVER/.test(text)) return [{ milestone: 1, achieved_at: 0 }, { milestone: 10, achieved_at: 10 }];
    if (/^SELECT COUNT\(\*\)::int AS count FROM subscribers s/.test(text)) return [{ count: 60 }];
    if (/WITH limits AS/.test(text)) return [{ day: "2026-07-18", signups: 2, active: 50 }];
    if (/SELECT s\.id, s\.email/.test(text)) return [];
    throw new Error(`Unexpected query: ${text.slice(0, 80)}`);
  };
  const filters = parseAdminFilters({ page: "2", range: "30" });
  const result = await loadAdminDashboard(query, filters);
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 3);
  assert.equal(result.selectedRange, "30");
  const subscriberQuery = calls.find((call) => /SELECT s\.id, s\.email/.test(call.text));
  assert.ok(subscriberQuery);
  assert.match(subscriberQuery.text, /LIMIT \$1 OFFSET \$2/);
  assert.deepEqual(subscriberQuery.params, [ADMIN_PAGE_SIZE, ADMIN_PAGE_SIZE]);
  assert.equal(calls.length, 8);
});

test("email, status, and source filters are normalized and parameterized", () => {
  const filters = parseAdminFilters({ page: "-4", search: " Reader%_ ", status: "active", source: "website-subscribe-form" });
  assert.deepEqual(filters, { page: 1, search: "reader%_", status: "active", source: "website-subscribe-form", range: "auto" });
  const where = subscriberWhere(filters);
  assert.match(where.sql, /LOWER\(s\.email\) LIKE \$1/);
  assert.match(where.sql, /s\.status = \$2/);
  assert.match(where.sql, /s\.consent_source = \$3/);
  assert.deepEqual(where.params, ["reader\\%\\_%", "active", "website-subscribe-form"]);
  assert.doesNotMatch(where.sql, /reader|website-subscribe-form/);
  assert.equal(parseAdminFilters({ status: "unknown" }).status, "all");
});

test("low-data editorial state and real first point remain in the dashboard", () => {
  const page = dashboardPage();
  assert.match(page, /You&apos;re just getting started/);
  assert.match(page, /First subscriber:/);
  assert.match(page, /<SignupChart points=\{dashboard\.growth\}/);
  assert.match(page, /<ActiveLineChart points=\{dashboard\.growth\}/);
  assert.match(page, /Zero-value dates remain in calculations/);
});

test("low-data percentage metrics use a dash with a neutral explanation", () => {
  const page = dashboardPage();
  assert.match(page, /return value === null \? "—"/);
  assert.match(page, /Growth rate this month[\s\S]*Not enough prior data/);
  assert.doesNotMatch(page, /value === null \? "Not enough prior data"/);
});

test("private section navigation is accessible and contains no subscriber data", () => {
  const navigation = fs.readFileSync("components/AdminSectionNav.tsx", "utf8");
  const page = dashboardPage();
  for (const id of ["overview", "growth", "velocity", "sources", "delivery", "activity", "subscribers", "milestones", "audience-snapshot"]) {
    assert.match(navigation, new RegExp(`\\[?"${id}"|#\\$\\{id\\}`));
    assert.match(page, new RegExp(`id="${id}"`));
  }
  assert.match(navigation, /aria-label="Dashboard sections"/);
  assert.match(navigation, /aria-current=/);
  assert.doesNotMatch(navigation, /email|subscriber\.email|loadAdminDashboard|fetch\(/i);
  assert.doesNotMatch(fs.readFileSync("components/Header.tsx", "utf8"), /AdminSectionNav|\/admin/);
});

test("charts and source visualization use the real aggregated dashboard series", () => {
  const page = dashboardPage();
  assert.match(page, /function SignupChart\(\{ points \}/);
  assert.match(page, /function ActiveLineChart\(\{ points \}/);
  assert.match(page, /dashboard\.growth/);
  assert.match(page, /function SourceDonut\(\{ sources \}/);
  assert.match(page, /<SourceDonut sources=\{dashboard\.sources\}/);
  assert.match(page, /role="img"/);
  assert.match(page, /Accessible growth data/);
  assert.doesNotMatch(page, /mock|hard-coded subscriber/i);
});

test("subscriber records retain accessible responsive table and mobile card views", () => {
  const page = dashboardPage();
  assert.match(page, /hidden overflow-x-auto[\s\S]*md:block/);
  assert.match(page, /md:hidden/);
  assert.match(page, /aria-label="Status"/);
  assert.match(page, /aria-label="Source"/);
  assert.match(page, /aria-label="Subscriber pagination"/);
  assert.match(page, /dashboard\.subscribers\.map/);
});

test("CSV export is authenticated before subscriber data is queried", () => {
  const route = fs.readFileSync("app/api/admin/subscribers.csv/route.ts", "utf8");
  const authIndex = route.indexOf("if (!(await isAdminAuthenticated()))");
  const queryIndex = route.indexOf("const rows = await loadAdminCsvRows");
  assert.ok(authIndex >= 0 && queryIndex >= 0 && authIndex < queryIndex);
  assert.match(route, /status: 401/);
  assert.match(route, /private, no-store/);
  assert.match(route, /source: url\.searchParams\.get\("source"\)/);
});

test("CSV values are escaped and spreadsheet formulas are neutralized", () => {
  assert.equal(csvEscape('a"b'), '"a""b"');
  assert.equal(csvEscape("=IMPORTDATA('x')"), '"\'=IMPORTDATA(\'x\')"');
  const csv = subscribersToCsv([{
    email: "reader@example.com",
    status: "active",
    created_at: Date.UTC(2026, 6, 18, 16, 38) / 1000,
    consent_source: "website, form",
    welcome_sent_at: null,
    unsubscribed_at: null
  }]);
  assert.match(csv, /^"email","status","signup date","source","welcome sent date","unsubscribed date"\r\n/);
  assert.match(csv, /"website, form"/);
  assert.match(csv, /"Jul 18, 2026 · 12:38 PM EDT"/);
  assert.equal((csv.match(/"—"/g) ?? []).length, 2);
  assert.doesNotMatch(csv, /2026-07-18T16:38:00\.000Z/);
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

test("subscriber analytics remain absent from public routes and navigation", () => {
  const subscribe = fs.readFileSync("app/api/subscribe/route.ts", "utf8");
  const header = fs.readFileSync("components/Header.tsx", "utf8");
  assert.doesNotMatch(subscribe, /NextResponse\.json\([^\n]*(?:email|subscriberId|outboxId|welcome_sent_at)/);
  assert.doesNotMatch(header, /\/admin|Admin/);
  assert.match(fs.readFileSync("app/admin/(protected)/layout.tsx", "utf8"), /requireAdmin/);
  const publicRoutes = fs.readdirSync("app/api", { recursive: true }).map(String).filter((file) => file.endsWith("route.ts") && !file.includes("admin"));
  for (const route of publicRoutes) {
    const source = fs.readFileSync(`app/api/${route}`, "utf8");
    assert.doesNotMatch(source, /loadAdminDashboard|normalizeOverview|calculateSourceShares/);
  }
});

test("dashboard does not invent open, click, bounce, campaign, or publisher-report metrics", () => {
  const page = dashboardPage();
  assert.doesNotMatch(page, /Open rate|Click rate|Bounce rate|Publisher Report/i);
  assert.doesNotMatch(page, /tracking pixel|third-party analytics/i);
  assert.match(page, /Open and click tracking are not enabled, preserving subscriber privacy/);
});

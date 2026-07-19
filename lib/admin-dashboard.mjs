import { formatAdminDate } from "./admin-date-format.mjs";

export const ADMIN_PAGE_SIZE = 25;
export const ADMIN_STATUSES = ["active", "pending", "unsubscribed", "suppressed"];
export const ADMIN_RANGES = ["7", "30", "90", "365", "all"];
export const REPORTING_TIME_ZONE = "America/New_York";
export const AUDIENCE_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000];

function scalar(value) {
  return Array.isArray(value) ? value[0] : value;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function number(value) {
  return Number(value ?? 0);
}

export function safePercent(numerator, denominator) {
  const top = Number(numerator);
  const bottom = Number(denominator);
  if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= 0) return null;
  return (top / bottom) * 100;
}

export function comparePeriods(current, previous) {
  const currentValue = number(current);
  const previousValue = number(previous);
  return {
    current: currentValue,
    previous: previousValue,
    change: currentValue - previousValue,
    percentChange: safePercent(currentValue - previousValue, previousValue)
  };
}

export function parseAdminFilters(input = {}) {
  const rawPage = scalar(input.page);
  const parsedPage = typeof rawPage === "string" && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const rawSearch = scalar(input.search);
  const search = typeof rawSearch === "string" ? rawSearch.trim().toLowerCase().slice(0, 254) : "";
  const rawStatus = scalar(input.status);
  const status = typeof rawStatus === "string" && ADMIN_STATUSES.includes(rawStatus) ? rawStatus : "all";
  const rawSource = scalar(input.source);
  const source = typeof rawSource === "string" && rawSource !== "all" ? rawSource.trim().slice(0, 120) : "all";
  const rawRange = scalar(input.range);
  const range = typeof rawRange === "string" && ADMIN_RANGES.includes(rawRange) ? rawRange : "auto";
  const rawCompare = scalar(input.compare);
  const compare = rawCompare === "1" || rawCompare === "true" || rawCompare === "on";
  return { page: Math.min(Math.max(parsedPage, 1), 100_000), search, status, source, range, compare };
}

export function subscriberWhere(filters, alias = "s") {
  const clauses = [];
  const params = [];
  if (filters.search) {
    params.push(`${escapeLike(filters.search)}%`);
    clauses.push(`LOWER(${alias}.email) LIKE $${params.length} ESCAPE '\\'`);
  }
  if (filters.status !== "all") {
    params.push(filters.status);
    clauses.push(`${alias}.status = $${params.length}`);
  }
  if (filters.source !== "all") {
    params.push(filters.source);
    clauses.push(`${alias}.consent_source = $${params.length}`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export function normalizeOverview(row = {}, delivery = {}) {
  const total = number(row.total);
  const active = number(row.active);
  const netThisMonth = number(row.net_this_month);
  const activeAtMonthStart = number(row.active_at_month_start);
  const firstSubscriberAt = row.first_subscriber_at == null ? null : number(row.first_subscriber_at);
  const generatedAt = row.generated_at == null ? Math.floor(Date.now() / 1000) : number(row.generated_at);
  const trackingDays = firstSubscriberAt == null ? 0 : Math.max(1, Math.ceil((generatedAt - firstSubscriberAt) / 86_400));
  const welcomeSent = number(delivery.welcome_sent);
  const welcomeTotal = number(delivery.welcome_total);

  return {
    total,
    active,
    pending: number(row.pending),
    unsubscribed: number(row.unsubscribed),
    suppressed: number(row.suppressed),
    today: number(row.today),
    current7: number(row.current_7),
    previous7: number(row.previous_7),
    thisMonth: number(row.this_month),
    previousMonth: number(row.previous_month),
    netThisMonth,
    netPreviousMonth: number(row.net_previous_month),
    net30Days: number(row.net_30_days),
    net90Days: number(row.net_90_days),
    activeAtMonthStart,
    growthRateThisMonth: safePercent(netThisMonth, activeAtMonthStart),
    welcomeDeliveryRate: safePercent(welcomeSent, welcomeTotal),
    unsubscribeRate: safePercent(number(row.unsubscribed), total),
    firstSubscriberAt,
    lastSubscriberAt: row.last_subscriber_at == null ? null : number(row.last_subscriber_at),
    generatedAt,
    trackingDays
  };
}

export function normalizeSubscriberSummary(row = {}, outbox = {}) {
  const overview = normalizeOverview(row, {
    welcome_sent: row.welcome_sent,
    welcome_total: Number(row.welcome_sent ?? 0) + Number(outbox.welcome_outstanding ?? 0)
  });
  return {
    total: overview.total,
    active: overview.active,
    pending: overview.pending,
    unsubscribed: overview.unsubscribed,
    suppressed: overview.suppressed,
    today: overview.today,
    last7Days: number(row.last_7_days ?? row.current_7),
    thisMonth: overview.thisMonth,
    welcomeSent: number(row.welcome_sent),
    welcomeOutstanding: number(outbox.welcome_outstanding)
  };
}

export function normalizeDeliveryHealth(row = {}) {
  const sent = number(row.welcome_sent);
  const queued = number(row.welcome_queued);
  const failed = number(row.welcome_failed);
  const total = number(row.welcome_total);
  return {
    sent,
    queued,
    failed,
    total,
    deliveryRate: safePercent(sent, total),
    mostRecentSentAt: row.most_recent_sent_at == null ? null : number(row.most_recent_sent_at),
    mostRecentFailureAt: row.most_recent_failure_at == null ? null : number(row.most_recent_failure_at),
    databaseStatus: "healthy",
    gmailStatus: failed > 0 ? "needs_attention" : "operational",
    queueStatus: failed > 0 ? "failed" : queued > 0 ? "pending" : "empty"
  };
}

export function calculateSourceShares(rows = []) {
  const normalized = rows.map((row) => ({ source: String(row.source || "unknown"), count: number(row.count) }));
  const total = normalized.reduce((sum, item) => sum + item.count, 0);
  return normalized.map((item) => ({ ...item, share: safePercent(item.count, total) ?? 0 }));
}

export function chooseGrowthRange(requestedRange, overview) {
  if (ADMIN_RANGES.includes(requestedRange)) return requestedRange;
  return overview.total >= 3 && overview.trackingDays >= 7 ? "30" : "7";
}

export function growthBucketSize(range, trackingDays = 0) {
  if (range === "365") return 7;
  if (range === "all") {
    if (trackingDays > 730) return 30;
    if (trackingDays > 120) return 7;
  }
  return 1;
}

export function buildGrowthSeries(rows = [], bucketSize = 1) {
  const size = Math.max(1, number(bucketSize));
  const points = [];
  for (let index = 0; index < rows.length; index += size) {
    const bucket = rows.slice(index, index + size);
    const first = bucket[0];
    const last = bucket.at(-1);
    const activations = bucket.reduce((sum, row) => sum + number(row.activations), 0);
    const unsubscribes = bucket.reduce((sum, row) => sum + number(row.unsubscribes), 0);
    points.push({
      day: String(last.day),
      startDay: String(first.day),
      signups: bucket.reduce((sum, row) => sum + number(row.signups), 0),
      activations,
      unsubscribes,
      netGrowth: activations - unsubscribes,
      active: Math.max(0, number(last.active))
    });
  }
  return points;
}

export function buildGrowthPeriods(rows = [], range = "7", trackingDays = 0) {
  const currentDaily = rows.filter((row) => row.period === "current");
  const previousDaily = rows.filter((row) => row.period === "previous");
  const bucketSize = growthBucketSize(range, trackingDays);
  return {
    current: buildGrowthSeries(currentDaily, bucketSize),
    previous: buildGrowthSeries(previousDaily, bucketSize),
    currentDaily,
    previousDaily,
    bucketSize,
    granularity: bucketSize === 1 ? "daily" : bucketSize === 7 ? "weekly" : "monthly"
  };
}

export function calculateGrowthKpis(points = [], periodDays = 0) {
  if (!points.length) {
    return { activeEnd: 0, activeStart: 0, netGrowth: 0, growthRate: null, averageNetPerDay: 0 };
  }
  const netGrowth = points.reduce((sum, point) => sum + number(point.netGrowth), 0);
  const activeEnd = number(points.at(-1).active);
  const activeStart = Math.max(0, number(points[0].active) - number(points[0].netGrowth));
  return {
    activeEnd,
    activeStart,
    netGrowth,
    growthRate: safePercent(netGrowth, activeStart),
    averageNetPerDay: periodDays > 0 ? netGrowth / periodDays : 0
  };
}

export function calculateGrowthVelocity(dailyPoints = []) {
  const normalized = dailyPoints.map((point) => ({
    day: String(point.day),
    signups: number(point.signups),
    unsubscribes: number(point.unsubscribes)
  }));
  const best = normalized.reduce((winner, point) => point.signups > (winner?.signups ?? 0) ? point : winner, null);
  let signupStreak = 0;
  for (let index = normalized.length - 1; index >= 0 && normalized[index].signups > 0; index -= 1) signupStreak += 1;
  let highestSevenDaySignups = 0;
  let rolling = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    rolling += normalized[index].signups;
    if (index >= 7) rolling -= normalized[index - 7].signups;
    highestSevenDaySignups = Math.max(highestSevenDaySignups, rolling);
  }
  return {
    bestAcquisitionDay: best?.signups ? best : null,
    signupStreak,
    highestSevenDaySignups,
    unsubscribes: normalized.reduce((sum, point) => sum + point.unsubscribes, 0)
  };
}

export function normalizeRecentActivity(rows = []) {
  return rows
    .map((row) => ({
      type: String(row.event_type),
      email: String(row.email),
      occurredAt: number(row.occurred_at)
    }))
    .sort((left, right) => right.occurredAt - left.occurredAt);
}

export function calculateMilestones(total, rows = []) {
  const achievedDates = new Map(rows.map((row) => [number(row.milestone), number(row.achieved_at)]));
  const milestones = AUDIENCE_MILESTONES.map((target) => ({
    target,
    achieved: number(total) >= target && achievedDates.has(target),
    achievedAt: achievedDates.get(target) ?? null
  }));
  const next = milestones.find((milestone) => !milestone.achieved) ?? null;
  return {
    milestones,
    next,
    progress: next ? Math.min(100, safePercent(number(total), next.target) ?? 0) : 100
  };
}

export function buildAudienceSnapshot(overview, sources, delivery) {
  const trackedMonths = Math.min(3, overview.trackingDays / 30);
  return {
    trackingStartAt: overview.firstSubscriberAt,
    activeSubscribers: overview.active,
    net30Days: overview.net30Days,
    net90Days: overview.net90Days,
    averageMonthlyNetGrowth: overview.trackingDays >= 60 && trackedMonths > 0
      ? overview.net90Days / trackedMonths
      : null,
    welcomeDeliveryRate: delivery.deliveryRate,
    unsubscribeRate: overview.unsubscribeRate,
    primarySource: sources[0]?.source ?? null
  };
}

const OVERVIEW_QUERY = `WITH people AS (
  SELECT *, COALESCE(confirmed_at, created_at) AS activated_at FROM subscribers
), local_clock AS (
  SELECT timezone('${REPORTING_TIME_ZONE}', NOW()) AS local_now
), boundaries AS (
  SELECT
    EXTRACT(EPOCH FROM (date_trunc('day', local_now) AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint AS today_start,
    EXTRACT(EPOCH FROM ((date_trunc('day', local_now) - INTERVAL '6 days') AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint AS current_7_start,
    EXTRACT(EPOCH FROM ((date_trunc('day', local_now) - INTERVAL '13 days') AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint AS previous_7_start,
    EXTRACT(EPOCH FROM (date_trunc('month', local_now) AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint AS month_start,
    EXTRACT(EPOCH FROM ((date_trunc('month', local_now) - INTERVAL '1 month') AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint AS previous_month_start,
    EXTRACT(EPOCH FROM ((date_trunc('month', local_now) - INTERVAL '2 months') AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint AS two_months_start,
    EXTRACT(EPOCH FROM ((date_trunc('day', local_now) - INTERVAL '29 days') AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint AS days_30_start,
    EXTRACT(EPOCH FROM ((date_trunc('day', local_now) - INTERVAL '89 days') AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint AS days_90_start
  FROM local_clock
)
SELECT
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE status = 'active')::int AS active,
  COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
  COUNT(*) FILTER (WHERE status = 'unsubscribed')::int AS unsubscribed,
  COUNT(*) FILTER (WHERE status = 'suppressed')::int AS suppressed,
  COUNT(*) FILTER (WHERE created_at >= b.today_start)::int AS today,
  COUNT(*) FILTER (WHERE created_at >= b.current_7_start)::int AS current_7,
  COUNT(*) FILTER (WHERE created_at >= b.previous_7_start AND created_at < b.current_7_start)::int AS previous_7,
  COUNT(*) FILTER (WHERE created_at >= b.month_start)::int AS this_month,
  COUNT(*) FILTER (WHERE created_at >= b.previous_month_start AND created_at < b.month_start)::int AS previous_month,
  COALESCE((SELECT SUM(CASE WHEN event_type = 'activated' THEN 1 ELSE -1 END) FROM subscriber_events WHERE occurred_at >= b.month_start), 0)::int AS net_this_month,
  COALESCE((SELECT SUM(CASE WHEN event_type = 'activated' THEN 1 ELSE -1 END) FROM subscriber_events WHERE occurred_at >= b.previous_month_start AND occurred_at < b.month_start), 0)::int AS net_previous_month,
  COALESCE((SELECT SUM(CASE WHEN event_type = 'activated' THEN 1 ELSE -1 END) FROM subscriber_events WHERE occurred_at >= b.days_30_start), 0)::int AS net_30_days,
  COALESCE((SELECT SUM(CASE WHEN event_type = 'activated' THEN 1 ELSE -1 END) FROM subscriber_events WHERE occurred_at >= b.days_90_start), 0)::int AS net_90_days,
  GREATEST(0, COALESCE((SELECT SUM(CASE WHEN event_type = 'activated' THEN 1 ELSE -1 END) FROM subscriber_events WHERE occurred_at < b.month_start), 0))::int AS active_at_month_start,
  MIN(created_at)::bigint AS first_subscriber_at,
  MAX(created_at)::bigint AS last_subscriber_at,
  EXTRACT(EPOCH FROM NOW())::bigint AS generated_at
FROM people CROSS JOIN boundaries b`;

const DELIVERY_QUERY = `SELECT
  COUNT(*) FILTER (WHERE status = 'sent')::int AS welcome_sent,
  COUNT(*) FILTER (WHERE status IN ('queued', 'sending'))::int AS welcome_queued,
  COUNT(*) FILTER (WHERE status = 'failed')::int AS welcome_failed,
  COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS welcome_total,
  MAX(sent_at) FILTER (WHERE status = 'sent')::bigint AS most_recent_sent_at,
  MAX(next_attempt_at - LEAST(21600, (60 * POWER(2, LEAST(GREATEST(attempts - 1, 0), 8)))::bigint))
    FILTER (WHERE status = 'failed')::bigint AS most_recent_failure_at
FROM email_outbox WHERE kind = 'welcome'`;

const SOURCES_QUERY = `SELECT consent_source AS source, COUNT(*)::int AS count
FROM subscribers GROUP BY consent_source ORDER BY count DESC, consent_source ASC`;

const RECENT_ACTIVITY_QUERY = `SELECT event_type, email, occurred_at FROM (
  SELECT 'subscriber_joined' AS event_type, email, created_at::bigint AS occurred_at FROM subscribers
  UNION ALL
  SELECT 'welcome_sent', s.email, o.sent_at::bigint
    FROM email_outbox o JOIN subscribers s ON s.id = o.subscriber_id
    WHERE o.kind = 'welcome' AND o.status = 'sent' AND o.sent_at IS NOT NULL
  UNION ALL
  SELECT 'subscriber_unsubscribed', email, unsubscribed_at::bigint
    FROM subscribers WHERE unsubscribed_at IS NOT NULL
  UNION ALL
  SELECT 'welcome_failed', s.email,
    (o.next_attempt_at - LEAST(21600, (60 * POWER(2, LEAST(GREATEST(o.attempts - 1, 0), 8)))::bigint))::bigint
    FROM email_outbox o JOIN subscribers s ON s.id = o.subscriber_id
    WHERE o.kind = 'welcome' AND o.status = 'failed'
) activity ORDER BY occurred_at DESC LIMIT 15`;

const MILESTONES_QUERY = `WITH ranked AS (
  SELECT created_at, ROW_NUMBER() OVER (ORDER BY created_at, id) AS subscriber_number FROM subscribers
)
SELECT subscriber_number::int AS milestone, created_at::bigint AS achieved_at
FROM ranked WHERE subscriber_number IN (1, 10, 25, 50, 100, 250, 500, 1000)
ORDER BY subscriber_number`;

export function growthQuery(rangeDays) {
  return {
    text: `WITH local_dates AS (
      SELECT
        (timezone('${REPORTING_TIME_ZONE}', NOW()))::date AS today,
        COALESCE(
          (SELECT MIN(timezone('${REPORTING_TIME_ZONE}', to_timestamp(occurred_at))::date) FROM subscriber_events),
          (SELECT MIN(timezone('${REPORTING_TIME_ZONE}', to_timestamp(created_at))::date) FROM subscribers),
          (timezone('${REPORTING_TIME_ZONE}', NOW()))::date
        ) AS tracking_start
    ), current_bounds AS (
      SELECT
        CASE WHEN $1::int IS NULL THEN tracking_start ELSE today - ($1::int - 1) END AS current_start,
        today + 1 AS current_end
      FROM local_dates
    ), bounds AS (
      SELECT
        current_start,
        current_end,
        current_start - (current_end - current_start) AS previous_start
      FROM current_bounds
    ), days AS (
      SELECT generate_series(previous_start, current_end - 1, INTERVAL '1 day')::date AS day
      FROM bounds
    ), event_daily AS (
      SELECT timezone('${REPORTING_TIME_ZONE}', to_timestamp(e.occurred_at))::date AS day,
        COUNT(*) FILTER (WHERE e.event_type = 'activated')::int AS activations,
        COUNT(*) FILTER (WHERE e.event_type IN ('unsubscribed', 'suppressed'))::int AS unsubscribes
      FROM subscriber_events e CROSS JOIN bounds b
      WHERE e.occurred_at >= EXTRACT(EPOCH FROM (b.previous_start::timestamp AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint
        AND e.occurred_at < EXTRACT(EPOCH FROM (b.current_end::timestamp AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint
      GROUP BY 1
    ), signup_daily AS (
      SELECT timezone('${REPORTING_TIME_ZONE}', to_timestamp(s.created_at))::date AS day, COUNT(*)::int AS signups
      FROM subscribers s CROSS JOIN bounds b
      WHERE s.created_at >= EXTRACT(EPOCH FROM (b.previous_start::timestamp AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint
        AND s.created_at < EXTRACT(EPOCH FROM (b.current_end::timestamp AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint
      GROUP BY 1
    ), baseline AS (
      SELECT COALESCE(SUM(CASE WHEN e.event_type = 'activated' THEN 1 ELSE -1 END), 0)::int AS active_before
      FROM subscriber_events e CROSS JOIN bounds b
      WHERE e.occurred_at < EXTRACT(EPOCH FROM (b.previous_start::timestamp AT TIME ZONE '${REPORTING_TIME_ZONE}'))::bigint
    ), daily AS (
      SELECT days.day,
        COALESCE(s.signups, 0)::int AS signups,
        COALESCE(e.activations, 0)::int AS activations,
        COALESCE(e.unsubscribes, 0)::int AS unsubscribes
      FROM days
      LEFT JOIN signup_daily s USING (day)
      LEFT JOIN event_daily e USING (day)
    )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
      CASE WHEN d.day >= b.current_start THEN 'current' ELSE 'previous' END AS period,
      d.signups, d.activations, d.unsubscribes,
      GREATEST(0, (SELECT active_before FROM baseline) + SUM(d.activations - d.unsubscribes) OVER (ORDER BY d.day))::int AS active
    FROM daily d CROSS JOIN bounds b
    ORDER BY d.day`,
    params: [rangeDays]
  };
}

export async function loadAdminDashboard(query, filters) {
  const where = subscriberWhere(filters);
  const [overviewRows, deliveryRows, sourceRows, recentRows, milestoneRows, countRows] = await Promise.all([
    query(OVERVIEW_QUERY),
    query(DELIVERY_QUERY),
    query(SOURCES_QUERY),
    query(RECENT_ACTIVITY_QUERY),
    query(MILESTONES_QUERY),
    query(`SELECT COUNT(*)::int AS count FROM subscribers s ${where.sql}`, where.params)
  ]);

  const delivery = normalizeDeliveryHealth(deliveryRows[0]);
  const overview = normalizeOverview(overviewRows[0], deliveryRows[0]);
  const sources = calculateSourceShares(sourceRows);
  const selectedRange = chooseGrowthRange(filters.range, overview);
  const rangeDays = selectedRange === "all" ? null : Number(selectedRange);
  const growth = growthQuery(rangeDays);
  const filteredCount = number(countRows[0]?.count);
  const pageCount = Math.max(1, Math.ceil(filteredCount / ADMIN_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const offset = (page - 1) * ADMIN_PAGE_SIZE;

  const [growthRows, subscribers] = await Promise.all([
    query(growth.text, growth.params),
    query(`SELECT s.id, s.email, s.status, s.created_at, s.consent_source, s.welcome_sent_at,
      s.unsubscribed_at, COALESCE(w.status, CASE WHEN s.welcome_sent_at IS NOT NULL THEN 'sent' ELSE 'not_queued' END) AS welcome_status
      FROM subscribers s
      LEFT JOIN LATERAL (
        SELECT status FROM email_outbox
        WHERE subscriber_id = s.id AND kind = 'welcome'
        ORDER BY created_at DESC, id DESC LIMIT 1
      ) w ON TRUE
      ${where.sql}
      ORDER BY s.created_at DESC, s.id DESC
      LIMIT $${where.params.length + 1} OFFSET $${where.params.length + 2}`,
      [...where.params, ADMIN_PAGE_SIZE, offset])
  ]);

  const growthPeriods = buildGrowthPeriods(growthRows, selectedRange, overview.trackingDays);
  const growthKpis = calculateGrowthKpis(growthPeriods.current, growthPeriods.currentDaily.length);

  return {
    overview,
    delivery,
    sources,
    growth: growthPeriods.current,
    previousGrowth: growthPeriods.previous,
    growthKpis,
    growthGranularity: growthPeriods.granularity,
    recentActivity: normalizeRecentActivity(recentRows),
    milestones: calculateMilestones(overview.total, milestoneRows),
    audienceSnapshot: buildAudienceSnapshot(overview, sources, delivery),
    velocity: calculateGrowthVelocity(growthPeriods.currentDaily),
    subscribers,
    filteredCount,
    pageCount,
    page,
    selectedRange,
    compareGrowth: filters.compare
  };
}

export async function loadAdminCsvRows(query, filters) {
  const where = subscriberWhere({ ...filters, page: 1 });
  return query(`SELECT s.email, s.status, s.created_at, s.consent_source, s.welcome_sent_at, s.unsubscribed_at,
      COALESCE(w.status, CASE WHEN s.welcome_sent_at IS NOT NULL THEN 'sent' ELSE 'not_queued' END) AS welcome_status
    FROM subscribers s
    LEFT JOIN LATERAL (
      SELECT status FROM email_outbox
      WHERE subscriber_id = s.id AND kind = 'welcome'
      ORDER BY created_at DESC, id DESC LIMIT 1
    ) w ON TRUE
    ${where.sql} ORDER BY s.created_at DESC, s.id DESC`, where.params);
}

export function csvEscape(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function subscribersToCsv(rows) {
  const header = ["email", "status", "signup date", "source", "welcome sent date", "unsubscribed date"];
  const lines = rows.map((row) => [
    row.email,
    row.status,
    formatAdminDate(row.created_at),
    row.consent_source,
    formatAdminDate(row.welcome_sent_at),
    formatAdminDate(row.unsubscribed_at)
  ]);
  return [header, ...lines].map((line) => line.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

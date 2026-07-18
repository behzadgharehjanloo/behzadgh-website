export const ADMIN_PAGE_SIZE = 25;
export const ADMIN_STATUSES = ["active", "pending", "unsubscribed", "suppressed"];

function scalar(value) {
  return Array.isArray(value) ? value[0] : value;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function parseAdminFilters(input = {}) {
  const rawPage = scalar(input.page);
  const parsedPage = typeof rawPage === "string" && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const rawSearch = scalar(input.search);
  const search = typeof rawSearch === "string" ? rawSearch.trim().toLowerCase().slice(0, 254) : "";
  const rawStatus = scalar(input.status);
  const status = typeof rawStatus === "string" && ADMIN_STATUSES.includes(rawStatus) ? rawStatus : "all";
  return { page: Math.min(Math.max(parsedPage, 1), 100_000), search, status };
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
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
}

export function normalizeSubscriberSummary(row = {}, outbox = {}) {
  return {
    total: Number(row.total ?? 0),
    active: Number(row.active ?? 0),
    pending: Number(row.pending ?? 0),
    unsubscribed: Number(row.unsubscribed ?? 0),
    suppressed: Number(row.suppressed ?? 0),
    today: Number(row.today ?? 0),
    last7Days: Number(row.last_7_days ?? 0),
    thisMonth: Number(row.this_month ?? 0),
    welcomeSent: Number(row.welcome_sent ?? 0),
    welcomeOutstanding: Number(outbox.welcome_outstanding ?? 0)
  };
}

export async function loadAdminDashboard(query, filters) {
  const where = subscriberWhere(filters);
  const [summaryRows, outboxRows, countRows, growth] = await Promise.all([
    query(`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'unsubscribed')::int AS unsubscribed,
      COUNT(*) FILTER (WHERE status = 'suppressed')::int AS suppressed,
      COUNT(*) FILTER (WHERE created_at >= EXTRACT(EPOCH FROM date_trunc('day', NOW()))::bigint)::int AS today,
      COUNT(*) FILTER (WHERE created_at >= EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days')::bigint)::int AS last_7_days,
      COUNT(*) FILTER (WHERE created_at >= EXTRACT(EPOCH FROM date_trunc('month', NOW()))::bigint)::int AS this_month,
      COUNT(*) FILTER (WHERE welcome_sent_at IS NOT NULL)::int AS welcome_sent
    FROM subscribers`),
    query(`SELECT COUNT(*)::int AS welcome_outstanding FROM email_outbox
      WHERE kind = 'welcome' AND status IN ('queued', 'failed')`),
    query(`SELECT COUNT(*)::int AS count FROM subscribers s ${where.sql}`, where.params),
    query(`WITH days AS (
      SELECT generate_series(
        date_trunc('day', NOW()) - INTERVAL '29 days',
        date_trunc('day', NOW()),
        INTERVAL '1 day'
      ) AS day
    ), totals AS (
      SELECT date_trunc('day', to_timestamp(created_at)) AS day, COUNT(*)::int AS count
      FROM subscribers
      WHERE created_at >= EXTRACT(EPOCH FROM date_trunc('day', NOW()) - INTERVAL '29 days')::bigint
      GROUP BY 1
    )
    SELECT to_char(days.day, 'YYYY-MM-DD') AS day, COALESCE(totals.count, 0)::int AS count
    FROM days LEFT JOIN totals ON totals.day = days.day ORDER BY days.day`)
  ]);

  const filteredCount = Number(countRows[0]?.count ?? 0);
  const pageCount = Math.max(1, Math.ceil(filteredCount / ADMIN_PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const offset = (page - 1) * ADMIN_PAGE_SIZE;
  const subscribers = await query(`SELECT s.id, s.email, s.status, s.created_at, s.consent_source, s.welcome_sent_at,
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
    [...where.params, ADMIN_PAGE_SIZE, offset]);

  return {
    summary: normalizeSubscriberSummary(summaryRows[0], outboxRows[0]),
    subscribers,
    growth: growth.map((row) => ({ day: String(row.day), count: Number(row.count) })),
    filteredCount,
    pageCount,
    page
  };
}

export async function loadAdminCsvRows(query, filters) {
  const where = subscriberWhere({ ...filters, page: 1 });
  return query(`SELECT s.email, s.status, s.created_at, s.consent_source, s.welcome_sent_at, s.unsubscribed_at
    FROM subscribers s ${where.sql} ORDER BY s.created_at DESC, s.id DESC`, where.params);
}

export function csvEscape(value) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvDate(value) {
  if (value === null || value === undefined || value === "") return "";
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function subscribersToCsv(rows) {
  const header = ["email", "status", "signup date", "source", "welcome sent date", "unsubscribed date"];
  const lines = rows.map((row) => [
    row.email,
    row.status,
    csvDate(row.created_at),
    row.consent_source,
    csvDate(row.welcome_sent_at),
    csvDate(row.unsubscribed_at)
  ]);
  return [header, ...lines].map((line) => line.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

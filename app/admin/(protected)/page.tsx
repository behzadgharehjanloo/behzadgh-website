import type { Metadata } from "next";
import Link from "next/link";
import {
  ADMIN_RANGES,
  ADMIN_STATUSES,
  loadAdminDashboard,
  parseAdminFilters,
  type AdminFilters,
  type GrowthPoint
} from "@/lib/admin-dashboard.mjs";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/database";

export const metadata: Metadata = {
  title: "Newsletter admin",
  robots: { index: false, follow: false }
};

function asDate(value: string | number | null) {
  if (value === null || value === undefined) return null;
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | number | null, includeTime = false) {
  const date = asDate(value);
  if (!date) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "UTC"
  }).format(date);
}

function formatRelative(value: string | number | null, now: number) {
  if (value === null || value === undefined) return "Not available";
  const seconds = Math.max(0, now - Number(value));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86_400);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

function formatPercent(value: number | null, digits = 0) {
  return value === null ? "Not enough prior data" : `${value.toFixed(digits)}%`;
}

function comparisonText(current: number, previous: number, period: string) {
  const change = current - previous;
  if (previous === 0) return "Not enough prior data";
  const percent = (change / previous) * 100;
  if (current + previous < 5) return `${signed(change)} vs ${period}`;
  return `${signed(change)} (${signed(Math.round(percent))}%) vs ${period}`;
}

function sourceLabel(value: string | null) {
  if (!value) return "Not available";
  const known: Record<string, string> = {
    "website-subscribe-form": "Website subscribe form",
    imported: "Imported",
    "admin-added": "Admin added"
  };
  return known[value] ?? value.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function withFilters(filters: AdminFilters, overrides: Partial<Record<keyof AdminFilters, string | number>>) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.search) params.set("search", String(next.search));
  if (next.status !== "all") params.set("status", String(next.status));
  if (next.source !== "all") params.set("source", String(next.source));
  const range = next.range === "auto" ? undefined : String(next.range);
  if (range) params.set("range", range);
  if (Number(next.page) > 1) params.set("page", String(next.page));
  const suffix = params.toString();
  return suffix ? `/admin?${suffix}` : "/admin";
}

function exportHref(filters: AdminFilters) {
  const url = withFilters(filters, { page: 1 });
  const queryString = url.includes("?") ? url.slice(url.indexOf("?")) : "";
  return `/api/admin/subscribers.csv${queryString}`;
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b692f]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-[#0b1d33] sm:text-[2.1rem]">{title}</h2>
      {copy ? <p className="mt-2 text-sm leading-6 text-muted">{copy}</p> : null}
    </div>
  );
}

function MetricCard({ label, value, note, primary = false }: { label: string; value: string; note: string; primary?: boolean }) {
  return (
    <article className={`border border-line bg-[#fbf8f2] ${primary ? "p-5 shadow-[0_12px_36px_rgba(11,29,51,0.045)]" : "p-4"}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={`${primary ? "mt-3 text-4xl" : "mt-2 text-2xl"} font-serif leading-none text-[#0b1d33]`}>{value}</p>
      <p className="mt-3 min-h-5 text-xs leading-5 text-muted">{note}</p>
    </article>
  );
}

function Chart({ points, metric, label }: { points: GrowthPoint[]; metric: "signups" | "active"; label: string }) {
  const maximum = Math.max(1, ...points.map((point) => point[metric]));
  const minimumWidth = Math.max(520, points.length * 8);
  return (
    <figure aria-label={label} className="overflow-hidden border border-line bg-[#fffdf8] p-4 sm:p-5">
      <figcaption className="text-sm font-semibold text-[#0b1d33]">{label}</figcaption>
      <div className="mt-5 overflow-x-auto pb-2">
        <div style={{ minWidth: `${minimumWidth}px` }}>
          <div
            aria-hidden="true"
            className="grid h-40 items-end gap-[2px] border-b border-[#d8ccbc] bg-[linear-gradient(to_bottom,transparent_49%,rgba(222,210,194,0.45)_50%,transparent_51%)]"
            style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(3px, 1fr))` }}
          >
            {points.map((point) => {
              const height = point[metric] === 0 ? 2 : Math.max(5, (point[metric] / maximum) * 100);
              return (
                <div key={point.day} className="flex h-full items-end" title={`${point.day}: ${point[metric]}`}>
                  <span
                    className={`block w-full ${metric === "signups" ? "bg-[#a67c35]" : "bg-[#203a57]"}`}
                    style={{ height: `${height}%`, opacity: point[metric] === 0 ? 0.16 : 0.88 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.08em] text-muted">
            <span>{points[0]?.day ?? "No data"}</span>
            <span>{points.length > 2 ? points[Math.floor(points.length / 2)]?.day : ""}</span>
            <span>{points.at(-1)?.day ?? ""}</span>
          </div>
        </div>
      </div>
    </figure>
  );
}

function ActivityLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    subscriber_joined: "Subscriber joined",
    welcome_sent: "Welcome email sent",
    subscriber_unsubscribed: "Subscriber unsubscribed",
    welcome_failed: "Welcome delivery failed"
  };
  return <>{labels[type] ?? titleCase(type)}</>;
}

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filters = parseAdminFilters(await searchParams);
  const dashboard = await loadAdminDashboard(
    (text, params) => query<Record<string, unknown>>(text, params),
    filters
  );
  const overview = dashboard.overview;
  const lowData = overview.total <= 2 || dashboard.growth.filter((point) => point.signups > 0).length <= 1;
  const rangeLabels: Record<string, string> = { "7": "7 days", "30": "30 days", "90": "90 days", all: "All time" };

  const primaryMetrics = [
    {
      label: "Total subscribers",
      value: overview.total.toLocaleString(),
      note: overview.firstSubscriberAt ? `Tracking since ${formatDate(overview.firstSubscriberAt)}` : "No subscribers yet"
    },
    {
      label: "Active subscribers",
      value: overview.active.toLocaleString(),
      note: `${overview.pending.toLocaleString()} pending · ${overview.suppressed.toLocaleString()} suppressed`
    },
    {
      label: "Net growth this month",
      value: signed(overview.netThisMonth),
      note: comparisonText(overview.netThisMonth, overview.netPreviousMonth, "previous month")
    },
    {
      label: "Growth rate this month",
      value: formatPercent(overview.growthRateThisMonth, 1),
      note: overview.growthRateThisMonth === null ? "No prior active-audience baseline" : "Based on audience at month start"
    },
    {
      label: "Welcome delivery rate",
      value: formatPercent(dashboard.delivery.deliveryRate, 1),
      note: dashboard.delivery.total ? `${dashboard.delivery.sent} of ${dashboard.delivery.total} welcome emails sent` : "No welcome deliveries yet"
    },
    {
      label: "Unsubscribe rate",
      value: formatPercent(overview.unsubscribeRate, 1),
      note: overview.total ? `${overview.unsubscribed} unsubscribed record${overview.unsubscribed === 1 ? "" : "s"}` : "No subscriber history yet"
    }
  ];

  const secondaryMetrics = [
    ["New today", overview.today.toLocaleString(), "Calendar day, UTC"],
    ["New in last 7 days", overview.current7.toLocaleString(), comparisonText(overview.current7, overview.previous7, "previous 7 days")],
    ["New this month", overview.thisMonth.toLocaleString(), comparisonText(overview.thisMonth, overview.previousMonth, "previous month")],
    ["Welcome queued or failed", (dashboard.delivery.queued + dashboard.delivery.failed).toLocaleString(), dashboard.delivery.failed ? `${dashboard.delivery.failed} need attention` : "No failed welcome items"],
    ["Last signup", overview.lastSubscriberAt ? formatDate(overview.lastSubscriberAt) : "None yet", overview.lastSubscriberAt ? formatRelative(overview.lastSubscriberAt, overview.generatedAt) : "Waiting for the first signup"],
    ["First subscriber", overview.firstSubscriberAt ? formatDate(overview.firstSubscriberAt) : "None yet", overview.firstSubscriberAt ? `${overview.trackingDays} day${overview.trackingDays === 1 ? "" : "s"} of history` : "Tracking begins with the first signup"]
  ] as const;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-8 sm:px-7 lg:px-10">
      <header className="flex flex-col gap-6 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8b692f]">Private audience intelligence</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-[#0b1d33] sm:text-5xl">Newsletter Dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Audience growth, delivery health, and recent activity.</p>
          <p className="mt-2 text-xs text-muted">Last updated <time dateTime={asDate(overview.generatedAt)?.toISOString()}>{formatDate(overview.generatedAt, true)} UTC</time></p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={exportHref(filters)} className="inline-flex min-h-11 items-center rounded-full border border-[#a67c35] bg-[#fffdf8] px-5 text-sm font-semibold text-[#0b1d33] transition hover:bg-[#f1e8da] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/40">
            Export CSV
          </Link>
          <form method="post" action="/api/admin/logout">
            <button type="submit" className="min-h-11 rounded-full px-4 text-sm font-medium text-muted underline transition hover:text-[#0b1d33] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/40">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section aria-labelledby="overview-heading" className="mt-9">
        <div id="overview-heading"><SectionHeading eyebrow="Executive overview" title="The audience at a glance" copy="Current reach, responsible growth signals, and delivery fundamentals." /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {primaryMetrics.map((metric) => <MetricCard key={metric.label} {...metric} primary />)}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {secondaryMetrics.map(([label, value, note]) => <MetricCard key={label} label={label} value={value} note={note} />)}
        </div>
      </section>

      <section aria-labelledby="growth-heading" className="mt-14 border-t border-line pt-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div id="growth-heading"><SectionHeading eyebrow="Audience growth" title="Growth over time" copy="Daily signups and the cumulative active audience, using only recorded subscriber events." /></div>
          <nav aria-label="Growth range" className="inline-flex w-fit flex-wrap gap-1 rounded-full border border-line bg-[#eee5d8] p-1">
            {ADMIN_RANGES.map((range) => (
              <Link
                key={range}
                href={withFilters(filters, { range, page: 1 })}
                aria-current={dashboard.selectedRange === range ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#a67c35]/50 ${dashboard.selectedRange === range ? "bg-[#0b1d33] text-[#fffaf1]" : "text-muted hover:text-[#0b1d33]"}`}
              >
                {rangeLabels[range]}
              </Link>
            ))}
          </nav>
        </div>

        {lowData && overview.firstSubscriberAt ? (
          <div className="mt-6 border-l-2 border-[#a67c35] bg-[#fbf8f2] px-5 py-5">
            <p className="font-serif text-2xl text-[#0b1d33]">You&apos;re just getting started.</p>
            <p className="mt-1 text-sm leading-6 text-muted">Your first subscriber joined on {formatDate(overview.firstSubscriberAt)}. Growth trends will become more meaningful as the audience grows.</p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <Chart points={dashboard.growth} metric="signups" label={`New signups · ${rangeLabels[dashboard.selectedRange]}`} />
          <Chart points={dashboard.growth} metric="active" label={`Cumulative active subscribers · ${rangeLabels[dashboard.selectedRange]}`} />
        </div>
        <details className="mt-3 border border-line bg-[#fbf8f2] px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-[#0b1d33] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/40">Accessible growth data</summary>
          <p className="mt-3 text-xs leading-5 text-muted">Zero-value dates are retained in calculations. This compact view prioritizes dates with activity.</p>
          <div className="mt-3 max-h-72 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead><tr className="border-b border-line"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">New</th><th className="py-2">Active</th></tr></thead>
              <tbody>
                {dashboard.growth.filter((point, index, all) => point.signups > 0 || index === 0 || index === all.length - 1).map((point) => (
                  <tr key={point.day} className="border-b border-line/70"><td className="py-2 pr-4">{point.day}</td><td className="py-2 pr-4">{point.signups}</td><td className="py-2">{point.active}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section aria-labelledby="velocity-heading" className="mt-14 border-t border-line pt-10">
        <div id="velocity-heading"><SectionHeading eyebrow="Growth velocity" title="Period-over-period pace" copy="Straight comparisons, with percentages withheld when a prior period has no baseline." /></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {[
            ["Seven-day pace", dashboard.velocity.weekly, "Current 7 days", "Previous 7 days"],
            ["Monthly pace", dashboard.velocity.monthly, "Current month", "Previous month"]
          ].map(([title, comparison, currentLabel, previousLabel]) => {
            const item = comparison as typeof dashboard.velocity.weekly;
            return (
              <article key={String(title)} className="border border-line bg-[#fbf8f2] p-5">
                <h3 className="font-serif text-2xl text-[#0b1d33]">{String(title)}</h3>
                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div><dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{String(currentLabel)}</dt><dd className="mt-1 font-serif text-3xl text-[#0b1d33]">{item.current}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-[0.12em] text-muted">{String(previousLabel)}</dt><dd className="mt-1 font-serif text-3xl text-[#0b1d33]">{item.previous}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-[0.12em] text-muted">Change</dt><dd className="mt-1 font-serif text-3xl text-[#0b1d33]">{signed(item.change)}</dd></div>
                  <div><dt className="text-[10px] uppercase tracking-[0.12em] text-muted">Rate</dt><dd className="mt-2 text-sm font-semibold text-[#0b1d33]">{formatPercent(item.percentChange, 0)}</dd></div>
                </dl>
                {item.current + item.previous < 5 ? <p className="mt-4 text-xs leading-5 text-muted">Early counts are shown plainly; more history is needed before treating this as a durable trend.</p> : null}
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-14 grid gap-6 border-t border-line pt-10 xl:grid-cols-2">
        <section aria-labelledby="sources-heading">
          <div id="sources-heading"><SectionHeading eyebrow="Acquisition sources" title="Where the audience begins" copy="Source labels are normalized for display; stored values remain unchanged." /></div>
          <div className="mt-5 border border-line bg-[#fbf8f2] p-5">
            {dashboard.sources.length ? (
              <ul className="space-y-5">
                {dashboard.sources.map((source) => (
                  <li key={source.source}>
                    <div className="flex items-baseline justify-between gap-4 text-sm"><span className="font-medium text-[#0b1d33]">{sourceLabel(source.source)}</span><span className="text-muted">{source.count} · {source.share.toFixed(0)}%</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5d9c8]" aria-hidden="true"><div className="h-full rounded-full bg-[#a67c35]" style={{ width: `${Math.max(source.share, source.count ? 3 : 0)}%` }} /></div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Source information will appear after the first subscriber joins.</p>}
          </div>
        </section>

        <section aria-labelledby="delivery-heading">
          <div id="delivery-heading"><SectionHeading eyebrow="Delivery health" title="Welcome-email operations" copy="A calm operational view derived from subscriber and outbox records; no live Google diagnostic is run." /></div>
          <div className="mt-5 border border-line bg-[#fbf8f2] p-5">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-[10px] uppercase tracking-[0.12em] text-muted">Sent</dt><dd className="mt-1 font-serif text-3xl text-[#0b1d33]">{dashboard.delivery.sent}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.12em] text-muted">Queued</dt><dd className="mt-1 font-serif text-3xl text-[#0b1d33]">{dashboard.delivery.queued}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.12em] text-muted">Failed</dt><dd className="mt-1 font-serif text-3xl text-[#0b1d33]">{dashboard.delivery.failed}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.12em] text-muted">Delivery rate</dt><dd className="mt-2 text-sm font-semibold text-[#0b1d33]">{formatPercent(dashboard.delivery.deliveryRate, 1)}</dd></div>
            </dl>
            <dl className="mt-5 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">Most recent successful send</dt><dd className="mt-1 font-medium text-[#0b1d33]">{formatDate(dashboard.delivery.mostRecentSentAt, true)}</dd></div>
              <div><dt className="text-muted">Most recent failure</dt><dd className="mt-1 font-medium text-[#0b1d33]">{formatDate(dashboard.delivery.mostRecentFailureAt, true)}</dd></div>
            </dl>
            <div className="mt-5 grid gap-2 border-t border-line pt-4 text-xs sm:grid-cols-3">
              <p><span className="text-muted">Database:</span> <strong className="text-[#0b1d33]">Healthy</strong></p>
              <p><span className="text-muted">Gmail delivery:</span> <strong className="text-[#0b1d33]">{dashboard.delivery.gmailStatus === "operational" ? "Operational" : "Needs attention"}</strong></p>
              <p><span className="text-muted">Queue:</span> <strong className="text-[#0b1d33]">{dashboard.delivery.queueStatus === "empty" ? "Empty" : dashboard.delivery.queueStatus === "pending" ? "Pending" : "Failed items"}</strong></p>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="activity-heading" className="mt-14 border-t border-line pt-10">
        <div id="activity-heading"><SectionHeading eyebrow="Recent activity" title="The latest recorded moments" copy="Newest first, assembled from existing subscriber and outbox events." /></div>
        <ol className="mt-5 divide-y divide-line border-y border-line bg-[#fbf8f2]">
          {dashboard.recentActivity.length ? dashboard.recentActivity.map((activity, index) => (
            <li key={`${activity.type}-${activity.email}-${activity.occurredAt}-${index}`} className="grid gap-1 px-4 py-4 sm:grid-cols-[minmax(180px,1fr)_minmax(240px,1.5fr)_auto] sm:items-center sm:gap-4">
              <span className="font-medium text-[#0b1d33]"><ActivityLabel type={activity.type} /></span>
              <span className="break-all text-sm text-muted">{activity.email}</span>
              <time dateTime={asDate(activity.occurredAt)?.toISOString()} title={formatDate(activity.occurredAt, true)} className="text-xs text-muted">{formatRelative(activity.occurredAt, overview.generatedAt)}</time>
            </li>
          )) : <li className="px-5 py-8 text-sm text-muted">Activity will appear after the first subscriber event.</li>}
        </ol>
      </section>

      <section aria-labelledby="subscribers-heading" className="mt-14 border-t border-line pt-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div id="subscribers-heading"><SectionHeading eyebrow="Subscriber records" title="Subscribers" copy={`${dashboard.filteredCount.toLocaleString()} matching record${dashboard.filteredCount === 1 ? "" : "s"}, newest first.`} /></div>
          <form method="get" action="/admin" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(210px,1fr)_160px_200px_auto] lg:items-end">
            <input type="hidden" name="range" value={dashboard.selectedRange} />
            <label className="text-xs font-semibold text-[#0b1d33]">Email starts with
              <input name="search" type="search" defaultValue={filters.search} maxLength={254} autoComplete="off" className="mt-2 min-h-11 w-full border border-line bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:border-[#a67c35]" />
            </label>
            <label className="text-xs font-semibold text-[#0b1d33]">Status
              <select name="status" defaultValue={filters.status} className="mt-2 min-h-11 w-full border border-line bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:border-[#a67c35]">
                <option value="all">All statuses</option>
                {ADMIN_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#0b1d33]">Source
              <select name="source" defaultValue={filters.source} className="mt-2 min-h-11 w-full border border-line bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:border-[#a67c35]">
                <option value="all">All sources</option>
                {dashboard.sources.map((source) => <option key={source.source} value={source.source}>{sourceLabel(source.source)}</option>)}
              </select>
            </label>
            <button type="submit" className="min-h-11 rounded-full bg-[#0b1d33] px-5 text-sm font-semibold text-[#fffaf1] transition hover:bg-[#17304d] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/50">Apply</button>
          </form>
        </div>

        {dashboard.subscribers.length === 0 ? (
          <div className="mt-6 border border-dashed border-line bg-[#fbf8f2] px-6 py-10 text-center"><p className="font-serif text-2xl text-[#0b1d33]">No subscribers found.</p><p className="mt-2 text-sm text-muted">Adjust the email, status, or source filter.</p></div>
        ) : (
          <>
            <div className="mt-6 hidden overflow-x-auto border border-line bg-[#fffdf8] md:block">
              <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
                <thead className="bg-[#eee5d8] text-[#0b1d33]"><tr>{["Email", "Joined", "Status", "Source", "Welcome status", "Welcome sent", "Unsubscribed"].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
                <tbody>{dashboard.subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-t border-line/80 align-top">
                    <td className="max-w-[260px] break-all px-4 py-3.5 font-medium text-[#0b1d33]">{subscriber.email}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-muted">{formatDate(subscriber.created_at, true)}</td>
                    <td className="px-4 py-3.5"><span className="inline-flex rounded-full border border-line bg-[#f7f1e7] px-2.5 py-1 font-semibold capitalize text-[#0b1d33]">{subscriber.status}</span></td>
                    <td className="px-4 py-3.5 text-muted">{sourceLabel(subscriber.consent_source)}</td>
                    <td className="px-4 py-3.5 capitalize text-muted">{titleCase(subscriber.welcome_status)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-muted">{formatDate(subscriber.welcome_sent_at, true)}</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-muted">{formatDate(subscriber.unsubscribed_at, true)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="mt-6 grid gap-3 md:hidden">
              {dashboard.subscribers.map((subscriber) => (
                <article key={subscriber.id} className="border border-line bg-[#fffdf8] p-4">
                  <div className="flex items-start justify-between gap-3"><p className="break-all text-sm font-semibold text-[#0b1d33]">{subscriber.email}</p><span className="rounded-full border border-line bg-[#f7f1e7] px-2 py-0.5 text-[10px] font-semibold capitalize text-[#0b1d33]">{subscriber.status}</span></div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs"><div><dt className="text-muted">Joined</dt><dd className="mt-1 text-[#0b1d33]">{formatDate(subscriber.created_at)}</dd></div><div><dt className="text-muted">Source</dt><dd className="mt-1 text-[#0b1d33]">{sourceLabel(subscriber.consent_source)}</dd></div><div><dt className="text-muted">Welcome</dt><dd className="mt-1 text-[#0b1d33]">{titleCase(subscriber.welcome_status)}</dd></div><div><dt className="text-muted">Unsubscribed</dt><dd className="mt-1 text-[#0b1d33]">{formatDate(subscriber.unsubscribed_at)}</dd></div></dl>
                </article>
              ))}
            </div>
          </>
        )}

        {dashboard.pageCount > 1 ? (
          <nav aria-label="Subscriber pagination" className="mt-6 flex items-center justify-between gap-4 text-sm">
            {dashboard.page > 1 ? <Link href={withFilters(filters, { range: dashboard.selectedRange, page: dashboard.page - 1 })} className="font-medium text-[#0b1d33] underline">Previous</Link> : <span className="text-muted/60">Previous</span>}
            <span className="text-muted">Page {dashboard.page.toLocaleString()} of {dashboard.pageCount.toLocaleString()}</span>
            {dashboard.page < dashboard.pageCount ? <Link href={withFilters(filters, { range: dashboard.selectedRange, page: dashboard.page + 1 })} className="font-medium text-[#0b1d33] underline">Next</Link> : <span className="text-muted/60">Next</span>}
          </nav>
        ) : null}
      </section>

      <div className="mt-14 grid gap-6 border-t border-line pt-10 xl:grid-cols-[0.9fr_1.1fr]">
        <section aria-labelledby="milestones-heading">
          <div id="milestones-heading"><SectionHeading eyebrow="Milestones" title="Audience progress" copy="Dates are shown only when the underlying subscriber count supports them." /></div>
          <div className="mt-5 border border-line bg-[#fbf8f2] p-5">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {dashboard.milestones.milestones.map((milestone) => (
                <li key={milestone.target} className={`border p-3 ${milestone.achieved ? "border-[#a67c35] bg-[#fffaf1]" : "border-line bg-[#f3ece1]"}`}>
                  <p className="font-serif text-2xl text-[#0b1d33]">{milestone.target.toLocaleString()}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted">{milestone.achieved ? formatDate(milestone.achievedAt) : "Not reached"}</p>
                </li>
              ))}
            </ol>
            {dashboard.milestones.next ? (
              <div className="mt-5 border-t border-line pt-4"><div className="flex justify-between text-xs"><span className="font-semibold text-[#0b1d33]">Next: {dashboard.milestones.next.target.toLocaleString()} subscribers</span><span className="text-muted">{overview.total} / {dashboard.milestones.next.target}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5d9c8]"><div className="h-full rounded-full bg-[#a67c35]" style={{ width: `${dashboard.milestones.progress}%` }} /></div></div>
            ) : <p className="mt-5 border-t border-line pt-4 text-sm text-muted">All current milestones have been reached.</p>}
          </div>
        </section>

        <section aria-labelledby="snapshot-heading">
          <div id="snapshot-heading"><SectionHeading eyebrow="Audience snapshot" title="Credible platform signals" copy="A concise private summary designed to support future conversations without overstating the available data." /></div>
          <div className="mt-5 border border-[#c7ae7d] bg-[#fffaf1] p-5 sm:p-6">
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Tracking start", formatDate(dashboard.audienceSnapshot.trackingStartAt)],
                ["Active subscribers", dashboard.audienceSnapshot.activeSubscribers.toLocaleString()],
                ["Net growth · 30 days", signed(dashboard.audienceSnapshot.net30Days)],
                ["Net growth · 90 days", signed(dashboard.audienceSnapshot.net90Days)],
                ["Average monthly net growth", dashboard.audienceSnapshot.averageMonthlyNetGrowth === null ? "Not enough history" : dashboard.audienceSnapshot.averageMonthlyNetGrowth.toFixed(1)],
                ["Welcome delivery rate", formatPercent(dashboard.audienceSnapshot.welcomeDeliveryRate, 1)],
                ["Unsubscribe rate", formatPercent(dashboard.audienceSnapshot.unsubscribeRate, 1)],
                ["Primary acquisition source", sourceLabel(dashboard.audienceSnapshot.primarySource)]
              ].map(([label, value]) => <div key={label}><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt><dd className="mt-1 font-serif text-xl text-[#0b1d33]">{value}</dd></div>)}
            </dl>
            <div className="mt-6 border-t border-[#d9c8aa] pt-4 text-xs leading-5 text-muted">
              <p>Open and click tracking are not enabled, preserving subscriber privacy.</p>
              <p className="mt-1">Exportable audience reports can be added once engagement history is available.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

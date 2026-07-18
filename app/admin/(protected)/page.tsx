import type { Metadata } from "next";
import Link from "next/link";
import { AdminSectionNav } from "@/components/AdminSectionNav";
import {
  ADMIN_RANGES,
  ADMIN_STATUSES,
  loadAdminDashboard,
  parseAdminFilters,
  type AdminFilters,
  type GrowthPoint,
  type SourceShare
} from "@/lib/admin-dashboard.mjs";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/database";

export const metadata: Metadata = {
  title: "Newsletter admin",
  robots: { index: false, follow: false }
};

const panel = "rounded-[10px] border border-line bg-[#fffdf8] shadow-[0_10px_30px_rgba(11,29,51,0.035)]";

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
  return value === null ? "—" : `${value.toFixed(digits)}%`;
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

function PanelHeading({ eyebrow, title, copy }: { eyebrow: string; title?: string; copy?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b692f]">{eyebrow}</p>
      {title ? <h2 className="mt-1.5 font-serif text-2xl leading-tight text-[#0b1d33]">{title}</h2> : null}
      {copy ? <p className="mt-1 text-xs leading-5 text-muted">{copy}</p> : null}
    </div>
  );
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className={`${panel} flex min-h-[118px] flex-col justify-between p-4`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#33465b]">{label}</p>
      <p className="mt-2 font-serif text-[clamp(1.55rem,2.4vw,2.15rem)] leading-none text-[#0b1d33]">{value}</p>
      <p className="mt-2 text-[11px] leading-4 text-muted">{note}</p>
    </article>
  );
}

function axisDates(points: GrowthPoint[]) {
  return [points[0]?.day ?? "No data", points[Math.floor((points.length - 1) / 2)]?.day ?? "", points.at(-1)?.day ?? ""];
}

function SignupChart({ points }: { points: GrowthPoint[] }) {
  const maximum = Math.max(1, ...points.map((point) => point.signups));
  const minimumWidth = Math.max(420, points.length * 7);
  const dates = axisDates(points);
  return (
    <figure aria-labelledby="signup-chart-title" className="min-w-0">
      <figcaption id="signup-chart-title" className="text-xs font-semibold text-[#0b1d33]">New signups by day</figcaption>
      <div className="mt-3 overflow-x-auto pb-1">
        <div style={{ minWidth: `${minimumWidth}px` }}>
          <div className="relative grid h-40 items-end gap-[2px] border-b border-[#cfc2b0]" style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(3px, 1fr))` }}>
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-[#e4dacd]" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 border-t border-[#eee6dc]" />
            {points.map((point) => {
              const height = point.signups === 0 ? 2 : Math.max(5, (point.signups / maximum) * 100);
              return (
                <span
                  key={point.day}
                  tabIndex={point.signups > 0 ? 0 : -1}
                  aria-label={`${point.day}: ${point.signups} new signup${point.signups === 1 ? "" : "s"}`}
                  className="relative z-10 flex h-full items-end rounded-sm outline-none focus:ring-2 focus:ring-[#0b1d33] focus:ring-offset-1"
                >
                  <span className="block w-full rounded-t-[2px] bg-[#b68a3b]" style={{ height: `${height}%`, opacity: point.signups === 0 ? 0.15 : 0.9 }} />
                </span>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[9px] uppercase tracking-[0.06em] text-muted"><span>{dates[0]}</span><span>{dates[1]}</span><span>{dates[2]}</span></div>
        </div>
      </div>
    </figure>
  );
}

function ActiveLineChart({ points }: { points: GrowthPoint[] }) {
  const width = 640;
  const height = 196;
  const insetX = 18;
  const insetY = 16;
  const maximum = Math.max(1, ...points.map((point) => point.active));
  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length <= 1 ? width / 2 : insetX + (index / (points.length - 1)) * (width - insetX * 2),
    y: height - insetY - (point.active / maximum) * (height - insetY * 2)
  }));
  const path = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const dates = axisDates(points);
  return (
    <figure aria-labelledby="active-chart-title" className="min-w-0">
      <figcaption id="active-chart-title" className="text-xs font-semibold text-[#0b1d33]">Cumulative active subscribers</figcaption>
      <div className="mt-3 overflow-x-auto pb-1">
        <div className="min-w-[420px]">
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Cumulative active subscribers from ${dates[0]} to ${dates[2]}`} className="h-40 w-full overflow-visible border-b border-[#cfc2b0]">
            {[0, 0.5, 1].map((ratio) => {
              const y = height - insetY - ratio * (height - insetY * 2);
              return <line key={ratio} x1={insetX} x2={width - insetX} y1={y} y2={y} stroke={ratio === 0 ? "#cfc2b0" : "#e4dacd"} strokeWidth="1" />;
            })}
            {path ? <path d={path} fill="none" stroke="#17304d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
            {coordinates.map((point) => (
              <circle key={point.day} cx={point.x} cy={point.y} r={point.active ? 4 : 2.5} fill="#17304d" tabIndex={0} className="outline-none focus:stroke-[#b68a3b] focus:stroke-[5px]">
                <title>{`${point.day}: ${point.active} active subscriber${point.active === 1 ? "" : "s"}`}</title>
              </circle>
            ))}
          </svg>
          <div className="mt-2 flex justify-between text-[9px] uppercase tracking-[0.06em] text-muted"><span>{dates[0]}</span><span>{dates[1]}</span><span>{dates[2]}</span></div>
        </div>
      </div>
    </figure>
  );
}

function SourceDonut({ sources }: { sources: SourceShare[] }) {
  const colors = ["#b68a3b", "#17304d", "#687262", "#9c6a52", "#8a7f75"];
  const circumference = 2 * Math.PI * 39;
  let consumed = 0;
  const total = sources.reduce((sum, source) => sum + source.count, 0);
  return (
    <div className="mt-4 grid items-center gap-4 sm:grid-cols-[132px_1fr] xl:grid-cols-1 2xl:grid-cols-[132px_1fr]">
      <div className="relative mx-auto h-32 w-32">
        <svg viewBox="0 0 100 100" role="img" aria-label={`${total} total subscribers across ${sources.length} acquisition source${sources.length === 1 ? "" : "s"}`} className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="39" fill="none" stroke="#ece2d4" strokeWidth="12" />
          {sources.map((source, index) => {
            const length = (source.share / 100) * circumference;
            const offset = consumed;
            consumed += length;
            return <circle key={source.source} cx="50" cy="50" r="39" fill="none" stroke={colors[index % colors.length]} strokeWidth="12" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />;
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center"><strong className="font-serif text-2xl font-normal text-[#0b1d33]">{total}</strong><span className="text-[8px] uppercase tracking-[0.12em] text-muted">Total</span></div>
      </div>
      <ul className="space-y-3">
        {sources.map((source, index) => (
          <li key={source.source} className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-[11px]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="leading-4 text-[#0b1d33]">{sourceLabel(source.source)}</span>
            <span className="whitespace-nowrap text-muted">{source.count} · {source.share.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusItem({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
  return (
    <p className="flex items-center gap-2 text-[11px]"><span aria-hidden="true" className={`h-2 w-2 rounded-full ${attention ? "bg-[#a06d4f]" : "bg-[#4f8a58]"}`} /><span className="text-muted">{label}</span><strong className="font-semibold text-[#0b1d33]">{value}</strong></p>
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

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const filters = parseAdminFilters(await searchParams);
  const dashboard = await loadAdminDashboard((text, params) => query<Record<string, unknown>>(text, params), filters);
  const overview = dashboard.overview;
  const lowData = overview.total <= 2 || dashboard.growth.filter((point) => point.signups > 0).length <= 1;
  const rangeLabels: Record<string, string> = { "7": "7D", "30": "30D", "90": "90D", all: "All time" };

  const metrics = [
    ["Total subscribers", overview.total.toLocaleString(), overview.firstSubscriberAt ? `Tracking since ${formatDate(overview.firstSubscriberAt)}` : "No subscribers yet"],
    ["Active subscribers", overview.active.toLocaleString(), `${overview.pending} pending · ${overview.suppressed} suppressed`],
    ["Net growth this month", signed(overview.netThisMonth), comparisonText(overview.netThisMonth, overview.netPreviousMonth, "previous month")],
    ["Growth rate this month", formatPercent(overview.growthRateThisMonth, 1), overview.growthRateThisMonth === null ? "Not enough prior data" : "Based on audience at month start"],
    ["Welcome delivery rate", formatPercent(dashboard.delivery.deliveryRate, 1), dashboard.delivery.total ? `${dashboard.delivery.sent} of ${dashboard.delivery.total} welcome emails sent` : "No welcome deliveries yet"],
    ["Unsubscribe rate", formatPercent(overview.unsubscribeRate, 1), overview.total ? `${overview.unsubscribed} unsubscribed` : "No subscriber history yet"],
    ["New today", overview.today.toLocaleString(), "Calendar day, UTC"],
    ["New in last 7 days", overview.current7.toLocaleString(), comparisonText(overview.current7, overview.previous7, "previous 7 days")],
    ["New this month", overview.thisMonth.toLocaleString(), comparisonText(overview.thisMonth, overview.previousMonth, "previous month")],
    ["Welcome queued or failed", (dashboard.delivery.queued + dashboard.delivery.failed).toLocaleString(), dashboard.delivery.failed ? `${dashboard.delivery.failed} need attention` : "No failed welcome items"],
    ["Last signup", overview.lastSubscriberAt ? formatDate(overview.lastSubscriberAt) : "None yet", overview.lastSubscriberAt ? formatRelative(overview.lastSubscriberAt, overview.generatedAt) : "Waiting for the first signup"],
    ["First subscriber", overview.firstSubscriberAt ? formatDate(overview.firstSubscriberAt) : "None yet", overview.firstSubscriberAt ? `${overview.trackingDays} day${overview.trackingDays === 1 ? "" : "s"} of history` : "Tracking begins with the first signup"]
  ] as const;

  return (
    <div className="mx-auto w-full max-w-[1540px] px-3 pb-20 pt-4 sm:px-6 lg:px-8">
      <div className="lg:grid lg:grid-cols-[178px_minmax(0,1fr)] lg:gap-6">
        <aside className="sticky top-[160px] z-20 -mx-3 border-y border-line bg-[#faf6ee]/95 px-2 py-2 backdrop-blur sm:-mx-6 sm:px-5 md:top-[76px] lg:static lg:mx-0 lg:border-y-0 lg:border-r lg:bg-transparent lg:px-0 lg:pr-4 lg:pt-5 lg:backdrop-blur-none">
          <AdminSectionNav />
        </aside>

        <div className="min-w-0 pt-5">
          <header className="flex flex-col gap-4 border-b border-line pb-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b692f]">Private audience intelligence</p>
              <h1 className="mt-1.5 font-serif text-4xl leading-tight text-[#0b1d33] sm:text-[2.75rem]">Newsletter Dashboard</h1>
              <p className="mt-1.5 text-xs leading-5 text-muted">Audience growth, delivery health, and recent activity.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <p className="mr-1 text-[10px] text-muted">Last updated <time dateTime={asDate(overview.generatedAt)?.toISOString()}>{formatDate(overview.generatedAt, true)} UTC</time></p>
              <Link href={exportHref(filters)} className="inline-flex min-h-10 items-center rounded-full border border-[#a67c35] bg-[#fffdf8] px-4 text-xs font-semibold text-[#0b1d33] transition hover:bg-[#f1e8da] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/40">Export CSV</Link>
              <form method="post" action="/api/admin/logout"><button type="submit" className="min-h-10 rounded-full px-3 text-xs font-medium text-muted underline transition hover:text-[#0b1d33] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/40">Sign out</button></form>
            </div>
          </header>

          <section id="overview" aria-labelledby="overview-heading" className="scroll-mt-48 pt-6 md:scroll-mt-28">
            <h2 id="overview-heading" className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b692f]">Executive overview</h2>
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, note]) => <MetricCard key={label} label={label} value={value} note={note} />)}</div>
          </section>

          <div className="mt-5 grid items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(310px,1fr)]">
            <section id="growth" aria-labelledby="growth-heading" className={`${panel} scroll-mt-48 p-4 md:scroll-mt-28 sm:p-5`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div id="growth-heading"><PanelHeading eyebrow="Audience growth" copy="Daily signups and cumulative active subscribers." /></div>
                <nav aria-label="Growth range" className="inline-flex w-fit shrink-0 gap-0.5 rounded-full border border-line bg-[#f3ece1] p-0.5">
                  {ADMIN_RANGES.map((range) => <Link key={range} href={withFilters(filters, { range, page: 1 })} aria-current={dashboard.selectedRange === range ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#a67c35]/50 ${dashboard.selectedRange === range ? "bg-[#0b1d33] text-[#fffaf1]" : "text-muted hover:text-[#0b1d33]"}`}>{rangeLabels[range]}</Link>)}
                </nav>
              </div>
              {lowData && overview.firstSubscriberAt ? <div className="mt-3 rounded-md border-l-2 border-[#a67c35] bg-[#f8f2e9] px-3 py-2"><p className="text-xs font-semibold text-[#0b1d33]">You&apos;re just getting started.</p><p className="mt-0.5 text-[10px] leading-4 text-muted">First subscriber: {formatDate(overview.firstSubscriberAt)}. Trends will become more meaningful as the audience grows.</p></div> : null}
              <div className="mt-5 grid gap-5 lg:grid-cols-2"><SignupChart points={dashboard.growth} /><ActiveLineChart points={dashboard.growth} /></div>
              <details className="mt-4 rounded-md border border-line bg-[#f8f2e9] px-3 py-2 text-xs">
                <summary className="cursor-pointer font-semibold text-[#0b1d33] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/40">Accessible growth data</summary>
                <p className="mt-2 text-[10px] leading-4 text-muted">Zero-value dates remain in calculations. This view prioritizes dates with activity.</p>
                <div className="mt-2 max-h-52 overflow-auto"><table className="w-full border-collapse text-left text-[10px]"><thead><tr className="border-b border-line"><th className="py-1.5 pr-4">Date</th><th className="py-1.5 pr-4">New</th><th className="py-1.5">Active</th></tr></thead><tbody>{dashboard.growth.filter((point, index, all) => point.signups > 0 || index === 0 || index === all.length - 1).map((point) => <tr key={point.day} className="border-b border-line/70"><td className="py-1.5 pr-4">{point.day}</td><td className="py-1.5 pr-4">{point.signups}</td><td className="py-1.5">{point.active}</td></tr>)}</tbody></table></div>
              </details>
            </section>

            <section id="velocity" aria-labelledby="velocity-heading" className={`${panel} scroll-mt-48 p-4 md:scroll-mt-28 sm:p-5`}>
              <div id="velocity-heading"><PanelHeading eyebrow="Growth velocity" copy="Straight comparisons of subscriber acquisition." /></div>
              <div className="mt-4 space-y-3">
                {[["Seven-day pace", dashboard.velocity.weekly, "Current 7 days", "Previous 7 days"], ["Monthly pace", dashboard.velocity.monthly, "Current month", "Previous month"]].map(([title, comparison, currentLabel, previousLabel]) => {
                  const item = comparison as typeof dashboard.velocity.weekly;
                  return <article key={String(title)} className="rounded-lg border border-line bg-[#fbf8f2] p-4"><h3 className="text-xs font-semibold text-[#0b1d33]">{String(title)}</h3><dl className="mt-4 grid grid-cols-2 gap-4"><div><dt className="text-[9px] uppercase tracking-[0.08em] text-muted">{String(currentLabel)}</dt><dd className="mt-1 font-serif text-2xl text-[#0b1d33]">{item.current}</dd></div><div><dt className="text-[9px] uppercase tracking-[0.08em] text-muted">{String(previousLabel)}</dt><dd className="mt-1 font-serif text-2xl text-[#0b1d33]">{item.previous}</dd></div><div><dt className="text-[9px] uppercase tracking-[0.08em] text-muted">Change</dt><dd className="mt-1 font-serif text-2xl text-[#0b1d33]">{signed(item.change)}</dd></div><div><dt className="text-[9px] uppercase tracking-[0.08em] text-muted">Rate</dt><dd className="mt-1 font-serif text-2xl text-[#0b1d33]">{formatPercent(item.percentChange, 0)}</dd></div></dl>{item.current + item.previous < 5 ? <p className="mt-3 text-[10px] leading-4 text-muted">Not enough prior data for a durable trend.</p> : null}</article>;
                })}
              </div>
            </section>
          </div>

          <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[0.85fr_1.35fr_1fr]">
            <section id="sources" aria-labelledby="sources-heading" className={`${panel} scroll-mt-48 p-4 md:scroll-mt-28`}>
              <div id="sources-heading"><PanelHeading eyebrow="Acquisition sources" copy="Where subscribers come from." /></div>
              {dashboard.sources.length ? <SourceDonut sources={dashboard.sources} /> : <p className="mt-5 text-xs text-muted">Source information appears after the first subscriber joins.</p>}
            </section>

            <section id="delivery" aria-labelledby="delivery-heading" className={`${panel} scroll-mt-48 p-4 md:scroll-mt-28`}>
              <div id="delivery-heading"><PanelHeading eyebrow="Delivery health" copy="Welcome email operations and system status." /></div>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><dt className="text-[9px] uppercase tracking-[0.08em] text-muted">Sent</dt><dd className="mt-1 font-serif text-2xl text-[#0b1d33]">{dashboard.delivery.sent}</dd></div><div><dt className="text-[9px] uppercase tracking-[0.08em] text-muted">Queued</dt><dd className="mt-1 font-serif text-2xl text-[#0b1d33]">{dashboard.delivery.queued}</dd></div><div><dt className="text-[9px] uppercase tracking-[0.08em] text-muted">Failed</dt><dd className="mt-1 font-serif text-2xl text-[#0b1d33]">{dashboard.delivery.failed}</dd></div><div><dt className="text-[9px] uppercase tracking-[0.08em] text-muted">Delivery rate</dt><dd className="mt-1 font-serif text-xl text-[#0b1d33]">{formatPercent(dashboard.delivery.deliveryRate, 1)}</dd></div></dl>
              <dl className="mt-4 grid gap-3 border-t border-line pt-3 text-[10px] sm:grid-cols-2"><div><dt className="text-muted">Most recent successful send</dt><dd className="mt-1 font-medium text-[#0b1d33]">{formatDate(dashboard.delivery.mostRecentSentAt, true)}</dd></div><div><dt className="text-muted">Most recent failure</dt><dd className="mt-1 font-medium text-[#0b1d33]">{formatDate(dashboard.delivery.mostRecentFailureAt, true)}</dd></div></dl>
              <div className="mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-3"><StatusItem label="Database" value="Healthy" /><StatusItem label="Gmail" value={dashboard.delivery.gmailStatus === "operational" ? "Operational" : "Needs attention"} attention={dashboard.delivery.gmailStatus !== "operational"} /><StatusItem label="Queue" value={dashboard.delivery.queueStatus === "empty" ? "Empty" : dashboard.delivery.queueStatus === "pending" ? "Pending" : "Failed items"} attention={dashboard.delivery.queueStatus === "failed"} /></div>
            </section>

            <section id="activity" aria-labelledby="activity-heading" className={`${panel} scroll-mt-48 p-4 md:scroll-mt-28`}>
              <div id="activity-heading"><PanelHeading eyebrow="Recent activity" copy="Newest recorded events." /></div>
              <ol className="mt-3 divide-y divide-line">
                {dashboard.recentActivity.length ? dashboard.recentActivity.slice(0, 6).map((activity, index) => <li key={`${activity.type}-${activity.email}-${activity.occurredAt}-${index}`} className="grid grid-cols-[22px_1fr_auto] gap-2 py-3"><span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold text-white ${activity.type.includes("failed") || activity.type.includes("unsubscribed") ? "bg-[#9c6a52]" : "bg-[#4f8a58]"}`}>{activity.type === "welcome_sent" ? "✓" : activity.type === "subscriber_joined" ? "+" : "·"}</span><div className="min-w-0"><p className="text-[11px] font-semibold text-[#0b1d33]"><ActivityLabel type={activity.type} /></p><p className="mt-0.5 truncate text-[10px] text-muted" title={activity.email}>{activity.email}</p></div><time dateTime={asDate(activity.occurredAt)?.toISOString()} title={formatDate(activity.occurredAt, true)} className="whitespace-nowrap text-[9px] text-muted">{formatRelative(activity.occurredAt, overview.generatedAt)}</time></li>) : <li className="py-5 text-xs text-muted">Activity appears after the first subscriber event.</li>}
              </ol>
            </section>
          </div>

          <section id="subscribers" aria-labelledby="subscribers-heading" className={`${panel} mt-4 scroll-mt-48 p-4 md:scroll-mt-28 sm:p-5`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div id="subscribers-heading"><PanelHeading eyebrow="Subscribers" copy={`${dashboard.filteredCount.toLocaleString()} matching record${dashboard.filteredCount === 1 ? "" : "s"}, newest first.`} /></div>
              <form method="get" action="/admin" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_150px_190px_auto] lg:items-end"><input type="hidden" name="range" value={dashboard.selectedRange} /><label className="text-[10px] font-semibold text-[#0b1d33]"><span className="sr-only">Email starts with</span><input name="search" type="search" defaultValue={filters.search} placeholder="Search by email…" maxLength={254} autoComplete="off" className="min-h-10 w-full rounded-md border border-line bg-[#fbf8f2] px-3 text-xs font-normal outline-none placeholder:text-muted focus:border-[#a67c35] focus:ring-2 focus:ring-[#a67c35]/20" /></label><label className="text-[10px] font-semibold text-[#0b1d33]"><span className="sr-only">Status</span><select name="status" aria-label="Status" defaultValue={filters.status} className="min-h-10 w-full rounded-md border border-line bg-[#fbf8f2] px-3 text-xs font-normal outline-none focus:border-[#a67c35]"><option value="all">All statuses</option>{ADMIN_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label><label className="text-[10px] font-semibold text-[#0b1d33]"><span className="sr-only">Source</span><select name="source" aria-label="Source" defaultValue={filters.source} className="min-h-10 w-full rounded-md border border-line bg-[#fbf8f2] px-3 text-xs font-normal outline-none focus:border-[#a67c35]"><option value="all">All sources</option>{dashboard.sources.map((source) => <option key={source.source} value={source.source}>{sourceLabel(source.source)}</option>)}</select></label><button type="submit" className="min-h-10 rounded-md bg-[#0b1d33] px-5 text-xs font-semibold text-[#fffaf1] transition hover:bg-[#17304d] focus:outline-none focus:ring-2 focus:ring-[#a67c35]/50">Apply</button></form>
            </div>
            {dashboard.subscribers.length === 0 ? <div className="mt-4 rounded-lg border border-dashed border-line bg-[#fbf8f2] px-5 py-8 text-center"><p className="font-serif text-xl text-[#0b1d33]">No subscribers found.</p><p className="mt-1 text-xs text-muted">Adjust the email, status, or source filter.</p></div> : <><div className="mt-4 hidden overflow-x-auto rounded-lg border border-line md:block"><table className="w-full min-w-[1040px] border-collapse bg-[#fffdf8] text-left text-[10px]"><thead className="bg-[#eee5d8] text-[#0b1d33]"><tr>{["Email", "Joined", "Status", "Source", "Welcome status", "Welcome sent", "Unsubscribed"].map((heading) => <th key={heading} scope="col" className="px-3 py-2.5 font-semibold">{heading}</th>)}</tr></thead><tbody>{dashboard.subscribers.map((subscriber) => <tr key={subscriber.id} className="border-t border-line/80 align-top"><td className="max-w-[250px] break-all px-3 py-3 font-medium text-[#0b1d33]">{subscriber.email}</td><td className="whitespace-nowrap px-3 py-3 text-muted">{formatDate(subscriber.created_at, true)}</td><td className="px-3 py-3"><span className="inline-flex rounded-full border border-[#b9cbae] bg-[#edf4e9] px-2 py-0.5 font-semibold capitalize text-[#315537]">{subscriber.status}</span></td><td className="px-3 py-3 text-muted">{sourceLabel(subscriber.consent_source)}</td><td className="px-3 py-3 capitalize text-muted">{titleCase(subscriber.welcome_status)}</td><td className="whitespace-nowrap px-3 py-3 text-muted">{formatDate(subscriber.welcome_sent_at, true)}</td><td className="whitespace-nowrap px-3 py-3 text-muted">{formatDate(subscriber.unsubscribed_at, true)}</td></tr>)}</tbody></table></div><div className="mt-4 grid gap-2 md:hidden">{dashboard.subscribers.map((subscriber) => <article key={subscriber.id} className="rounded-lg border border-line bg-[#fbf8f2] p-3"><div className="flex items-start justify-between gap-3"><p className="break-all text-xs font-semibold text-[#0b1d33]">{subscriber.email}</p><span className="rounded-full border border-[#b9cbae] bg-[#edf4e9] px-2 py-0.5 text-[9px] font-semibold capitalize text-[#315537]">{subscriber.status}</span></div><dl className="mt-3 grid grid-cols-2 gap-3 text-[10px]"><div><dt className="text-muted">Joined</dt><dd className="mt-0.5 text-[#0b1d33]">{formatDate(subscriber.created_at)}</dd></div><div><dt className="text-muted">Source</dt><dd className="mt-0.5 text-[#0b1d33]">{sourceLabel(subscriber.consent_source)}</dd></div><div><dt className="text-muted">Welcome</dt><dd className="mt-0.5 text-[#0b1d33]">{titleCase(subscriber.welcome_status)}</dd></div><div><dt className="text-muted">Unsubscribed</dt><dd className="mt-0.5 text-[#0b1d33]">{formatDate(subscriber.unsubscribed_at)}</dd></div></dl></article>)}</div></>}
            {dashboard.pageCount > 1 ? <nav aria-label="Subscriber pagination" className="mt-4 flex items-center justify-between gap-4 text-xs">{dashboard.page > 1 ? <Link href={withFilters(filters, { range: dashboard.selectedRange, page: dashboard.page - 1 })} className="font-medium text-[#0b1d33] underline">Previous</Link> : <span className="text-muted/60">Previous</span>}<span className="text-muted">Page {dashboard.page} of {dashboard.pageCount}</span>{dashboard.page < dashboard.pageCount ? <Link href={withFilters(filters, { range: dashboard.selectedRange, page: dashboard.page + 1 })} className="font-medium text-[#0b1d33] underline">Next</Link> : <span className="text-muted/60">Next</span>}</nav> : null}
          </section>

          <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[1fr_1.1fr]">
            <section id="milestones" aria-labelledby="milestones-heading" className={`${panel} scroll-mt-48 p-4 md:scroll-mt-28`}>
              <div id="milestones-heading"><PanelHeading eyebrow="Milestones" copy="Audience progress over time." /></div>
              <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{dashboard.milestones.milestones.map((milestone) => <li key={milestone.target} className={`rounded-md border p-2.5 text-center ${milestone.achieved ? "border-[#a67c35] bg-[#b68a3b] text-white" : dashboard.milestones.next?.target === milestone.target ? "border-[#a67c35] bg-[#fffaf1]" : "border-line bg-[#fbf8f2]"}`}><p className={`font-serif text-xl ${milestone.achieved ? "text-white" : "text-[#0b1d33]"}`}>{milestone.target.toLocaleString()}</p><p className={`mt-1 text-[8px] uppercase tracking-[0.08em] ${milestone.achieved ? "text-white/85" : "text-muted"}`}>{milestone.achieved ? `Achieved · ${formatDate(milestone.achievedAt)}` : dashboard.milestones.next?.target === milestone.target ? "Next milestone" : "Future"}</p></li>)}</ol>
              {dashboard.milestones.next ? <div className="mt-4 border-t border-line pt-3"><div className="flex justify-between text-[10px]"><span className="font-semibold text-[#0b1d33]">Next: {dashboard.milestones.next.target.toLocaleString()} subscribers</span><span className="text-muted">{overview.total} / {dashboard.milestones.next.target}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5d9c8]"><div className="h-full rounded-full bg-[#a67c35]" style={{ width: `${dashboard.milestones.progress}%` }} /></div></div> : <p className="mt-4 border-t border-line pt-3 text-xs text-muted">All current milestones have been reached.</p>}
            </section>

            <section id="audience-snapshot" aria-labelledby="snapshot-heading" className={`${panel} scroll-mt-48 border-[#c7ae7d] bg-[#fffaf1] p-4 md:scroll-mt-28`}>
              <div id="snapshot-heading"><PanelHeading eyebrow="Audience snapshot" copy="A concise summary for future conversations." /></div>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">{[["Tracking start", formatDate(dashboard.audienceSnapshot.trackingStartAt)], ["Active subscribers", dashboard.audienceSnapshot.activeSubscribers.toLocaleString()], ["Net growth · 30 days", signed(dashboard.audienceSnapshot.net30Days)], ["Net growth · 90 days", signed(dashboard.audienceSnapshot.net90Days)], ["Average monthly net growth", dashboard.audienceSnapshot.averageMonthlyNetGrowth === null ? "Not enough history" : dashboard.audienceSnapshot.averageMonthlyNetGrowth.toFixed(1)], ["Welcome delivery rate", formatPercent(dashboard.audienceSnapshot.welcomeDeliveryRate, 1)], ["Unsubscribe rate", formatPercent(dashboard.audienceSnapshot.unsubscribeRate, 1)], ["Primary source", sourceLabel(dashboard.audienceSnapshot.primarySource)]].map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-[#e4d7c2] pb-2"><dt className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt><dd className="text-right text-[11px] font-medium text-[#0b1d33]">{value}</dd></div>)}</dl>
              <div className="mt-4 rounded-md border border-[#dfd0b8] bg-[#fbf5e9] px-3 py-2 text-[10px] leading-4 text-muted"><p>Open and click tracking are not enabled, preserving subscriber privacy.</p><p>Exportable audience reports can be added once engagement history is available.</p></div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

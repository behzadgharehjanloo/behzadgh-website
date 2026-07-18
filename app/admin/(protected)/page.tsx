import type { Metadata } from "next";
import Link from "next/link";
import {
  ADMIN_STATUSES,
  loadAdminDashboard,
  parseAdminFilters,
  type AdminFilters
} from "@/lib/admin-dashboard.mjs";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/database";

export const metadata: Metadata = {
  title: "Newsletter admin",
  robots: { index: false, follow: false }
};

function formatDate(value: string | number | null, includeTime = false) {
  if (value === null || value === undefined) return "—";
  const date = new Date(Number(value) * 1000);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "UTC"
  }).format(date);
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function adminHref(filters: AdminFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/admin?${suffix}` : "/admin";
}

function exportHref(filters: AdminFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status !== "all") params.set("status", filters.status);
  const suffix = params.toString();
  return suffix ? `/api/admin/subscribers.csv?${suffix}` : "/api/admin/subscribers.csv";
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
  const maxDaily = Math.max(1, ...dashboard.growth.map((item) => item.count));
  const summaryCards = [
    ["Total subscribers", dashboard.summary.total],
    ["Active", dashboard.summary.active],
    ["Unsubscribed", dashboard.summary.unsubscribed],
    ["Suppressed", dashboard.summary.suppressed],
    ["New today", dashboard.summary.today],
    ["Last 7 days", dashboard.summary.last7Days],
    ["This month", dashboard.summary.thisMonth],
    ["Welcome sent", dashboard.summary.welcomeSent],
    ["Welcome queued / failed", dashboard.summary.welcomeOutstanding]
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a742f]">Private admin</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-[#0b1d33] sm:text-5xl">Newsletter dashboard</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Subscriber health, delivery status, and recent growth.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={exportHref(filters)}
            className="inline-flex min-h-11 items-center rounded-full border border-[#b08a45] px-5 text-sm font-semibold text-[#0b1d33] transition hover:bg-[#efe4d2] focus:outline-none focus:ring-2 focus:ring-[#b08a45]/40"
          >
            Export CSV
          </Link>
          <form method="post" action="/api/admin/logout">
            <button type="submit" className="min-h-11 px-2 text-sm font-medium text-muted underline transition hover:text-[#0b1d33] focus:outline-none focus:ring-2 focus:ring-[#b08a45]/40">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section aria-labelledby="summary-heading" className="mt-8">
        <h2 id="summary-heading" className="sr-only">Newsletter summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {summaryCards.map(([label, count]) => (
            <article key={label} className="border border-line bg-[#fbf8f2] p-5 shadow-[0_10px_35px_rgba(11,29,51,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
              <p className="mt-3 font-serif text-4xl text-[#0b1d33]">{count.toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="subscribers-heading" className="mt-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="subscribers-heading" className="font-serif text-3xl text-[#0b1d33]">Subscribers</h2>
            <p className="mt-2 text-sm text-muted">{dashboard.filteredCount.toLocaleString()} matching record{dashboard.filteredCount === 1 ? "" : "s"}</p>
          </div>
          <form method="get" action="/admin" className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_auto] sm:items-end">
            <label className="text-sm font-medium text-[#0b1d33]">
              Email starts with
              <input
                name="search"
                type="search"
                defaultValue={filters.search}
                maxLength={254}
                autoComplete="off"
                className="mt-2 min-h-11 w-full border border-line bg-[#fbf8f2] px-3 text-sm text-[#0b1d33] outline-none focus:border-[#b08a45]"
              />
            </label>
            <label className="text-sm font-medium text-[#0b1d33]">
              Status
              <select name="status" defaultValue={filters.status} className="mt-2 min-h-11 w-full border border-line bg-[#fbf8f2] px-3 text-sm text-[#0b1d33] outline-none focus:border-[#b08a45]">
                <option value="all">All statuses</option>
                {ADMIN_STATUSES.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
              </select>
            </label>
            <button type="submit" className="min-h-11 rounded-full bg-[#0b1d33] px-5 text-sm font-semibold text-paper transition hover:bg-[#17304d] focus:outline-none focus:ring-2 focus:ring-[#b08a45]/50">
              Apply
            </button>
          </form>
        </div>

        {dashboard.subscribers.length === 0 ? (
          <div className="mt-6 border border-dashed border-line bg-[#fbf8f2] px-6 py-12 text-center">
            <p className="font-serif text-2xl text-[#0b1d33]">No subscribers found.</p>
            <p className="mt-2 text-sm text-muted">Adjust the email search or status filter.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto border border-line bg-[#fbf8f2]">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="bg-[#efe7da] text-[#0b1d33]">
                <tr>
                  {['Email', 'Signup date', 'Status', 'Source', 'Welcome status', 'Welcome sent', 'Unsubscribed'].map((heading) => (
                    <th key={heading} scope="col" className="px-4 py-3 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboard.subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-t border-line/80 align-top">
                    <td className="max-w-[280px] break-all px-4 py-4 font-medium text-[#0b1d33]">{subscriber.email}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDate(subscriber.created_at, true)}</td>
                    <td className="px-4 py-4"><span className="inline-flex rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-semibold capitalize text-[#0b1d33]">{subscriber.status}</span></td>
                    <td className="px-4 py-4 text-muted">{subscriber.consent_source}</td>
                    <td className="px-4 py-4 capitalize text-muted">{titleCase(subscriber.welcome_status)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDate(subscriber.welcome_sent_at, true)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">{formatDate(subscriber.unsubscribed_at, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dashboard.pageCount > 1 ? (
          <nav aria-label="Subscriber pagination" className="mt-6 flex items-center justify-between gap-4 text-sm">
            {dashboard.page > 1 ? <Link href={adminHref(filters, dashboard.page - 1)} className="font-medium text-[#0b1d33] underline">Previous</Link> : <span className="text-muted/60">Previous</span>}
            <span className="text-muted">Page {dashboard.page.toLocaleString()} of {dashboard.pageCount.toLocaleString()}</span>
            {dashboard.page < dashboard.pageCount ? <Link href={adminHref(filters, dashboard.page + 1)} className="font-medium text-[#0b1d33] underline">Next</Link> : <span className="text-muted/60">Next</span>}
          </nav>
        ) : null}
      </section>

      <section aria-labelledby="growth-heading" className="mt-14 border-t border-line pt-10">
        <h2 id="growth-heading" className="font-serif text-3xl text-[#0b1d33]">Daily signups — last 30 days</h2>
        <div className="mt-6 overflow-x-auto border border-line bg-[#fbf8f2]">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead className="bg-[#efe7da] text-[#0b1d33]"><tr><th scope="col" className="px-4 py-3 font-semibold">Date</th><th scope="col" className="px-4 py-3 font-semibold">Signups</th><th scope="col" className="w-2/3 px-4 py-3 font-semibold">Relative volume</th></tr></thead>
            <tbody>{dashboard.growth.map((day) => (
              <tr key={day.day} className="border-t border-line/80">
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{day.day}</td>
                <td className="px-4 py-2.5 font-semibold text-[#0b1d33]">{day.count}</td>
                <td className="px-4 py-2.5"><div className="h-2 w-full bg-[#e5d9c8]" aria-hidden="true"><div className="h-2 bg-[#b08a45]" style={{ width: `${(day.count / maxDaily) * 100}%` }} /></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

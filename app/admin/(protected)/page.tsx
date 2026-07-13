import type { Metadata } from "next";
import { query } from "@/lib/database";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false }
};

type SubscriberRow = { id: string | number; email: string; status: string; created_at: string | number };

export default async function AdminPage() {
  const [counts, latest] = await Promise.all([
    query<{ status: string; count: number }>("SELECT status, COUNT(*)::int AS count FROM subscribers GROUP BY status"),
    query<SubscriberRow>("SELECT id, email, status, created_at FROM subscribers ORDER BY created_at DESC LIMIT 25")
  ]);
  const countFor = (status: string) => counts.find((item) => item.status === status)?.count ?? 0;
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-12 sm:px-8">
      <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase text-sage">Private admin</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight text-ink">Newsletter dashboard</h1>
        </div>
        <form method="post" action="/api/admin/logout">
          <button type="submit" className="text-sm text-muted underline transition hover:text-ink focus:outline-none focus:ring-2 focus:ring-clay/30">
            Sign out
          </button>
        </form>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[["Pending", countFor("pending")], ["Active", countFor("active")], ["Unsubscribed", countFor("unsubscribed")]].map(([label, count]) => (
          <div key={label} className="border border-line p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 font-serif text-4xl text-ink">{count}</p>
          </div>
        ))}
      </div>
      <section className="mt-10" aria-labelledby="recent-subscribers">
        <h2 id="recent-subscribers" className="font-serif text-3xl text-ink">Recent subscribers</h2>
        {latest.length === 0 ? (
          <p className="mt-4 text-base leading-7 text-muted">No subscription requests yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr className="border-b border-line text-muted"><th className="py-3 pr-4 font-medium">Email</th><th className="py-3 pr-4 font-medium">Status</th><th className="py-3 font-medium">Requested</th></tr></thead>
              <tbody>{latest.map((subscriber) => (
                <tr key={subscriber.id} className="border-b border-line/70"><td className="py-4 pr-4 text-ink">{subscriber.email}</td><td className="py-4 pr-4 capitalize text-muted">{subscriber.status}</td><td className="py-4 text-muted">{new Date(Number(subscriber.created_at) * 1000).toISOString().slice(0, 10)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

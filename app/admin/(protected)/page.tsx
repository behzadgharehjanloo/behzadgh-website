import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false }
};

export default function AdminPage() {
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
      <p className="mt-8 max-w-2xl text-base leading-7 text-muted">
        The private foundation is ready. Subscriber management will be added in the next phase.
      </p>
    </div>
  );
}

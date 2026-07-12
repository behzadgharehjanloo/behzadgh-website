import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Receive future notes by email."
};

const messages: Record<string, string> = {
  saved: "Thanks. Your request has been saved. No email will be sent until confirmation is available.",
  invalid: "Enter a valid email address.",
  limited: "Too many attempts were received. Please try again later."
};

export default async function SubscribePage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  const message = result ? messages[result] : undefined;
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-12 sm:px-8">
      <p className="text-sm uppercase text-sage">Subscribe</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight text-ink sm:text-6xl">Receive future notes by email.</h1>
      <form method="post" action="/api/subscribe" className="mt-10 border-y border-line py-8" aria-label="Email signup">
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email address
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            required
            className="min-h-12 flex-1 border border-line bg-paper px-4 text-base text-ink outline-none transition placeholder:text-muted/70 focus:border-ink"
          />
          <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <button
            type="submit"
            className="min-h-12 rounded-full bg-ink px-6 text-sm font-medium text-paper transition hover:bg-clay focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper"
          >
            Subscribe
          </button>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted" aria-live="polite">
          {message ?? "Subscribe to receive occasional notes. You can unsubscribe at any time."}
        </p>
      </form>
    </div>
  );
}

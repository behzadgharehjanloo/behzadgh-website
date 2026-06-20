import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscribe",
  description: "Receive future notes by email."
};

export default function SubscribePage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-14 sm:px-8 md:pt-20">
      <p className="text-sm uppercase text-sage">Subscribe</p>
      <h1 className="mt-3 font-serif text-[34px] font-medium leading-[1.15] text-ink sm:text-5xl sm:leading-[1.1]">
        Receive future notes by email.
      </h1>
      <form className="mt-10 border-y border-line py-8" action="#" aria-label="Email signup placeholder">
        <label htmlFor="email" className="block text-base font-medium text-ink">
          Email address
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="min-h-12 flex-1 border border-line bg-paper px-4 text-[17px] text-ink outline-none transition placeholder:text-muted/70 focus:border-ink"
          />
          <button
            type="button"
            className="min-h-12 rounded-full bg-ink px-6 text-base font-medium text-paper transition hover:bg-clay focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper"
          >
            Subscribe
          </button>
        </div>
        <p className="mt-4 max-w-[680px] text-[17px] leading-[1.7] text-muted">
          Signup is a placeholder for now. No backend is connected yet.
        </p>
      </form>
    </div>
  );
}

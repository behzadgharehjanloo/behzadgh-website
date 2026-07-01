"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function FollowSignup() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO: Connect this form to the chosen email platform and send only the welcome email on signup.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mt-10 border-y border-line py-8">
        <h2 className="font-serif text-[30px] font-medium leading-tight text-ink sm:text-[38px]">Welcome.</h2>
        <div className="mt-5 max-w-[680px] space-y-3 text-[17px] leading-[1.7] text-muted sm:text-lg sm:leading-[1.68]">
          <p>The next note will find you when it&rsquo;s ready.</p>
          <p>Until then, you&rsquo;re welcome to explore earlier notes.</p>
        </div>
        <Link
          href="/notes"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-transparent px-6 text-base font-medium text-ink transition hover:border-ink focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper"
        >
          Explore Earlier Notes
        </Link>
      </div>
    );
  }

  return (
    <form className="mt-10 border-y border-line py-8" onSubmit={handleSubmit} aria-label="Follow by email">
      <label htmlFor="email" className="block text-base font-medium text-ink">
        Email address
      </label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          className="min-h-12 flex-1 border border-line bg-paper px-4 text-[17px] text-ink outline-none transition placeholder:text-muted/70 focus:border-ink"
        />
        <button
          type="submit"
          className="min-h-12 rounded-full bg-ink px-6 text-base font-medium text-paper transition hover:bg-clay focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper"
        >
          Receive the Next Note
        </button>
      </div>
      <p className="mt-4 max-w-[680px] text-sm leading-6 text-muted">
        Your email stays private. I&rsquo;ll only use it to send new notes, and you can unsubscribe at any time.
      </p>
    </form>
  );
}

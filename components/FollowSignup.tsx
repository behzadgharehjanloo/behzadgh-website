"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FollowSignup() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim().toLowerCase();

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
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
          aria-describedby={error ? "email-error email-privacy" : "email-privacy"}
          className="min-h-12 flex-1 border border-line bg-paper px-4 text-[17px] text-ink outline-none transition placeholder:text-muted/70 focus:border-ink"
        />
        <button
          type="submit"
          disabled={isPending}
          aria-disabled={isPending}
          className="min-h-12 rounded-full bg-ink px-6 text-base font-medium text-paper transition hover:bg-clay focus:outline-none focus:ring-2 focus:ring-clay/30 focus:ring-offset-2 focus:ring-offset-paper"
        >
          {isPending ? "Joining..." : "Receive the Next Note"}
        </button>
      </div>
      {error ? (
        <p id="email-error" className="mt-4 max-w-[680px] text-sm leading-6 text-[#8f2f2f]" role="alert">
          {error}
        </p>
      ) : null}
      <p id="email-privacy" className="mt-4 max-w-[680px] text-sm leading-6 text-muted">
        Your email stays private. I&rsquo;ll only use it to send new notes, and you can unsubscribe at any time.
      </p>
    </form>
  );
}

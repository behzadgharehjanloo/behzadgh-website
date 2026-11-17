import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact",
  description: "Contact details for Behzad Gharehjanloo."
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pb-20 pt-14 sm:px-8 md:pt-20">
      <p className="text-sm uppercase text-sage">Contact</p>
      <h1 className="mt-3 font-serif text-[34px] font-medium leading-[1.15] text-ink sm:text-5xl sm:leading-[1.1]">
        Stay in touch.
      </h1>
      <div className="mt-10 border-y border-line py-8">
        <p className="max-w-[680px] text-[17px] leading-[1.7] text-ink sm:text-lg">
          You can follow the writing project and receive new notes by email.
        </p>
        <Link href="/subscribe" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-paper transition hover:bg-clay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
          Follow the Journey
        </Link>
      </div>
    </div>
  );
}

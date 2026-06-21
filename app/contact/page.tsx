import type { Metadata } from "next";

export const metadata: Metadata = {
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
        <dl className="space-y-6 text-[17px] leading-[1.7] text-ink sm:text-lg sm:leading-[1.68]">
          <div>
            <dt className="text-sm font-semibold uppercase tracking-[0.14em] text-sage">Email</dt>
            <dd className="mt-2">Email placeholder</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase tracking-[0.14em] text-sage">Instagram</dt>
            <dd className="mt-2">Instagram placeholder</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase tracking-[0.14em] text-sage">Facebook</dt>
            <dd className="mt-2">Facebook placeholder</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

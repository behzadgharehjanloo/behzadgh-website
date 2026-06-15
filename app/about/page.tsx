import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "A short introduction to Behzad Gharehjanloo."
};

export default function AboutPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-12 sm:px-8 md:grid-cols-[0.8fr_1.2fr] lg:px-10">
      <div>
        <p className="text-sm uppercase text-sage">About</p>
        <h1 className="mt-3 font-serif text-5xl leading-tight text-ink sm:text-6xl">A quiet place</h1>
      </div>
      <div className="max-w-2xl border-t border-line pt-8">
        <p className="font-serif text-3xl leading-10 text-ink">
          I&apos;m Behzad Gharehjanloo. This website is a place for notes, photographs, and occasional letters.
        </p>
      </div>
    </div>
  );
}

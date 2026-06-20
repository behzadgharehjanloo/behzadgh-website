import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "A short introduction to Behzad Gharehjanloo."
};

export default function AboutPage() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-14 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:pt-20 lg:px-10">
      <div>
        <p className="text-sm uppercase text-sage">About</p>
        <h1 className="mt-3 font-serif text-[34px] font-medium leading-[1.15] text-ink sm:text-5xl sm:leading-[1.1]">
          A quiet place
        </h1>
      </div>
      <div className="max-w-[680px] border-t border-line pt-8">
        <p className="text-[17px] leading-[1.7] text-ink sm:text-lg sm:leading-[1.68]">
          I&apos;m based in New York City and work in architecture and technology.
        </p>
        <p className="mt-6 text-[17px] leading-[1.7] text-ink sm:text-lg sm:leading-[1.68]">
          For years, people have told me that I should write a book. Eventually, I decided to find out whether they were
          right.
        </p>
        <p className="mt-6 text-[17px] leading-[1.7] text-ink sm:text-lg sm:leading-[1.68]">
          This website is where I share notes, photographs, and stories from a project that has been quietly taking shape
          for a long time.
        </p>
        <p className="mt-6 text-[17px] leading-[1.7] text-ink sm:text-lg sm:leading-[1.68]">
          I hope you&apos;ll enjoy following along.
        </p>
      </div>
    </div>
  );
}

import { NoteList } from "@/components/NoteList";

export default function Home() {
  return (
    <div className="w-full">
      <section className="relative flex min-h-[90vh] w-full items-center overflow-hidden bg-[#efe5d6]">
        <div
          className="absolute inset-0 bg-cover bg-[position:76%_center] sm:bg-[position:center_center]"
          style={{ backgroundImage: "url('/train-window-hero.png')" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(250,246,238,0.92)_0%,rgba(250,246,238,0.76)_31%,rgba(250,246,238,0.18)_58%,rgba(12,14,18,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(250,246,238,0.42)_0%,rgba(250,246,238,0)_26%)]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-28 sm:px-8 lg:px-10">
          <div className="h-px w-20 bg-[#b08a45]" />
          <h1 className="mt-8 max-w-[620px] font-serif text-[48px] font-medium leading-[1.04] text-[#111827] sm:text-[72px] md:text-[86px]">
            A story
            <br />
            still unfolding.
          </h1>
          <p className="mt-7 max-w-[520px] text-[18px] leading-[1.65] text-[#1f2933] sm:text-[21px]">
            Some journeys change where you go.
            <br />
            Others change who you become.
          </p>
          <a
            href="/subscribe"
            className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold uppercase tracking-[0.16em] text-[#111827] shadow-[0_18px_50px_rgba(17,24,39,0.18)] transition hover:bg-[#f7efe2] hover:text-[#8f6d2f] focus:outline-none focus:ring-2 focus:ring-[#b08a45]/40 focus:ring-offset-2 focus:ring-offset-transparent"
          >
            JOIN THE JOURNEY &rarr;
          </a>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-16 sm:px-8 md:pt-20 lg:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase text-sage">Latest</p>
            <h2 className="mt-2 font-serif text-[26px] font-medium leading-[1.2] text-ink sm:text-[32px]">Notes</h2>
          </div>
          <ButtonLink href="/notes" variant="secondary" className="hidden sm:inline-flex">
            Archive
          </ButtonLink>
        </div>
        <NoteList limit={3} />
      </section>
    </div>
  );
}

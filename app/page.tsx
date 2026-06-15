import { ButtonLink } from "@/components/ButtonLink";
import { NoteList } from "@/components/NoteList";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-8 lg:px-10">
      <section className="grid items-center gap-10 py-8 md:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.78fr)] md:py-16">
        <div>
          <p className="text-sm uppercase text-sage">behzadgh.com</p>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[0.98] text-ink sm:text-6xl lg:text-7xl">
            Behzad Gharehjanloo
          </h1>
          <p className="mt-6 max-w-xl text-xl leading-8 text-muted">
            Notes, photographs, and occasional letters.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/notes">Read Notes</ButtonLink>
            <ButtonLink href="/subscribe" variant="secondary">
              Subscribe
            </ButtonLink>
          </div>
        </div>

        <div className="relative min-h-[420px] overflow-hidden border border-line bg-[#ebe0d1] shadow-soft sm:min-h-[520px]">
          <div className="absolute inset-5 border border-paper/70" />
          <div className="absolute inset-x-8 bottom-8">
            <p className="max-w-56 text-sm leading-6 text-muted">
              Portrait image placeholder
            </p>
          </div>
        </div>
      </section>

      <section className="pt-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase text-sage">Latest</p>
            <h2 className="mt-2 font-serif text-4xl text-ink">Notes</h2>
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

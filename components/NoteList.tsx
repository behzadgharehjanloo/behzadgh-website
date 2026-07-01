import Link from "next/link";
import { notes } from "@/lib/notes";

type NoteListProps = {
  limit?: number;
};

export function NoteList({ limit }: NoteListProps) {
  const visibleNotes = typeof limit === "number" ? notes.slice(0, limit) : notes;

  return (
    <div className="grid gap-4">
      {visibleNotes.map((note) => (
        <article key={note.slug} className="border-y border-line py-6 sm:grid sm:grid-cols-[7rem_1fr] sm:gap-6">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sage">Note {note.number}</p>
          <div className="mt-3 sm:mt-0">
            <h2 className="font-serif text-[28px] font-medium leading-tight text-ink sm:text-[34px]">{note.title}</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{note.excerpt}</p>
            <Link
              href={`/notes/${note.slug}`}
              className="mt-4 inline-flex text-sm font-semibold uppercase tracking-[0.12em] text-ink transition hover:text-clay"
            >
              Read &rarr;
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

import Link from "next/link";
import { notes } from "@/lib/notes";

type NoteListProps = {
  limit?: number;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric"
});

export function NoteList({ limit }: NoteListProps) {
  const visibleNotes = typeof limit === "number" ? notes.slice(0, limit) : notes;

  return (
    <div className="divide-y divide-line border-y border-line">
      {visibleNotes.map((note) => (
        <article key={note.slug} className="grid gap-4 py-6 md:grid-cols-[9rem_1fr]">
          <p className="text-sm text-muted">{dateFormatter.format(new Date(`${note.date}T12:00:00`))}</p>
          <div>
            <Link href={`/notes/${note.slug}`} className="group inline-block">
              <p className="text-sm uppercase text-sage">Note {note.number}</p>
              <h2 className="mt-1 font-serif text-3xl leading-tight text-ink group-hover:underline">
                {note.title}
              </h2>
            </Link>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">{note.excerpt}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

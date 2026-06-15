import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNoteBySlug, notes } from "@/lib/notes";

type NotePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric"
});

export function generateStaticParams() {
  return notes.map((note) => ({
    slug: note.slug
  }));
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = getNoteBySlug(slug);

  if (!note) {
    return {
      title: "Note"
    };
  }

  return {
    title: note.title,
    description: note.excerpt
  };
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params;
  const note = getNoteBySlug(slug);

  if (!note) {
    notFound();
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-5 pb-16 pt-12 sm:px-8">
      <Link href="/notes" className="text-sm text-muted transition hover:text-ink">
        Back to Notes
      </Link>
      <p className="mt-10 text-sm uppercase text-sage">Note {note.number}</p>
      <h1 className="mt-3 font-serif text-5xl leading-tight text-ink sm:text-6xl">{note.title}</h1>
      <p className="mt-5 text-sm text-muted">{dateFormatter.format(new Date(`${note.date}T12:00:00`))}</p>
      <div className="mt-10 space-y-7 border-t border-line pt-10 font-serif text-2xl leading-10 text-ink/90">
        {note.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

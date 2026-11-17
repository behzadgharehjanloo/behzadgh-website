import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNoteBySlug, notes } from "@/lib/notes";
import {publishedStudioNote} from "@/lib/notes-studio-public";

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

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return notes.map((note) => ({
    slug: note.slug
  }));
}

export async function generateMetadata({ params }: NotePageProps): Promise<Metadata> {
  const { slug } = await params;
  const note = getNoteBySlug(slug);
  const studio = await publishedStudioNote(slug);
  if (studio) return {title: studio.title,alternates:{canonical:`/notes/${studio.slug}`},description:studio.body.slice(0,155)};

  if (!note) {
    return {
      title: "Note"
    };
  }

  return {
    title: note.title,
    alternates: { canonical: `/notes/${note.slug}` },
    description: note.excerpt
  };
}

export default async function NotePage({ params }: NotePageProps) {
  const { slug } = await params;
  const note = getNoteBySlug(slug);
  const studio = await publishedStudioNote(slug);
  if (studio) return <article className="mx-auto w-full max-w-3xl px-5 pb-16 pt-12 sm:px-8">
    <Link href="/notes" className="text-sm text-muted transition hover:text-ink">Back to Earlier Notes</Link>
    <h1 className="mt-10 font-serif text-5xl leading-tight text-ink sm:text-6xl">{studio.title}</h1>
    <p className="mt-5 text-sm text-muted">{dateFormatter.format(new Date(studio.published_at))}</p>
    <div className="mt-10 space-y-7 border-t border-line pt-10 font-serif text-2xl leading-10 text-ink/90">{studio.body.split(/\n\s*\n/).map((paragraph,index)=><p key={index} className="whitespace-pre-wrap">{paragraph}</p>)}</div>
  </article>;

  if (!note) {
    notFound();
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-5 pb-16 pt-12 sm:px-8">
      <Link href="/notes" className="text-sm text-muted transition hover:text-ink">
        Back to Earlier Notes
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

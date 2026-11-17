import type { Metadata } from "next";
import { NoteList } from "@/components/NoteList";
import { notes } from "@/lib/notes";
import Link from "next/link";
import {publishedStudioNotes} from "@/lib/notes-studio-public";

export const metadata: Metadata = {
  alternates: { canonical: "/notes" },
  title: "Earlier Notes",
  description: "Earlier notes from Behzad Gharehjanloo's personal writing project."
};

export const dynamic = "force-dynamic";
export default async function NotesPage() {
  const published=await publishedStudioNotes();
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-20 pt-14 sm:px-8 md:pt-20 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm uppercase text-sage">Archive</p>
        <h1 className="mt-3 font-serif text-[38px] font-medium leading-[1.12] text-ink sm:text-6xl sm:leading-[1.05]">
          Earlier Notes
        </h1>
        <p className="mt-5 max-w-[680px] text-[17px] leading-[1.7] text-muted sm:text-lg sm:leading-[1.68]">
          For readers joining later, these are earlier notes from the project.
        </p>
      </div>
      <div className="mt-10">
        {published.length > 0 ? <ul className="space-y-7">{published.map(note => <li key={note.slug} className="border-t border-line pt-6"><Link href={`/notes/${note.slug}`} className="font-serif text-3xl underline-offset-4 hover:underline">{note.title}</Link><p className="mt-3 text-sm text-muted">{new Date(note.published_at).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</p></li>)}</ul> : notes.length > 0 ? <NoteList /> : (
          <p className="border-t border-line pt-8 text-[17px] text-muted">The first notes will appear here when they are ready.</p>
        )}
      </div>
    </div>
  );
}

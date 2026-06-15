import type { Metadata } from "next";
import { NoteList } from "@/components/NoteList";

export const metadata: Metadata = {
  title: "Notes",
  description: "An archive of notes from Behzad Gharehjanloo."
};

export default function NotesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-12 sm:px-8 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm uppercase text-sage">Archive</p>
        <h1 className="mt-3 font-serif text-5xl leading-tight text-ink sm:text-6xl">Notes</h1>
        <p className="mt-5 text-lg leading-8 text-muted">
          A simple archive of notes, gathered in one place.
        </p>
      </div>
      <div className="mt-10">
        <NoteList />
      </div>
    </div>
  );
}

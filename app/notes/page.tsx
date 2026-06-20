import type { Metadata } from "next";
import { NoteList } from "@/components/NoteList";

export const metadata: Metadata = {
  title: "Notes",
  description: "An archive of notes from Behzad Gharehjanloo."
};

export default function NotesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-14 sm:px-8 md:pt-20 lg:px-10">
      <div className="max-w-3xl">
        <p className="text-sm uppercase text-sage">Archive</p>
        <h1 className="mt-3 font-serif text-[34px] font-medium leading-[1.15] text-ink sm:text-5xl sm:leading-[1.1]">
          Notes
        </h1>
        <p className="mt-5 max-w-[680px] text-[17px] leading-[1.7] text-muted sm:text-lg sm:leading-[1.68]">
          A simple archive of notes, gathered in one place.
        </p>
      </div>
      <div className="mt-10">
        <NoteList />
      </div>
    </div>
  );
}

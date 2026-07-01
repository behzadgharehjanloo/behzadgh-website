import type { Metadata } from "next";
import { NoteList } from "@/components/NoteList";

export const metadata: Metadata = {
  title: "Earlier Notes",
  description: "Earlier notes from Behzad Gharehjanloo's personal writing project."
};

export default function NotesPage() {
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
        <NoteList />
      </div>
    </div>
  );
}

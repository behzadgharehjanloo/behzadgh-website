export type Note = {
  slug: string;
  number: string;
  title: string;
  date: string;
  excerpt: string;
  body: string[];
};

// Publish only approved, authentic notes. The former sample entries were placeholders.
export const notes: Note[] = [];

export function getLatestNotes(count = 3) {
  return notes.slice(0, count);
}

export function getNoteBySlug(slug: string) {
  return notes.find((note) => note.slug === slug);
}

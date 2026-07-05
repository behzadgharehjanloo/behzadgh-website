export type Note = {
  slug: string;
  number: string;
  title: string;
  date: string;
  excerpt: string;
  body: string[];
};

export const notes: Note[] = [
  {
    slug: "note-01",
    number: "01",
    title: "Note 01",
    date: "2026-01-01",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 01 placeholder."
    ]
  },
  {
    slug: "note-02",
    number: "02",
    title: "Note 02",
    date: "2026-01-02",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 02 placeholder."
    ]
  },
  {
    slug: "note-03",
    number: "03",
    title: "Note 03",
    date: "2026-01-03",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 03 placeholder."
    ]
  },
  {
    slug: "note-04",
    number: "04",
    title: "Note 04",
    date: "2026-01-04",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 04 placeholder."
    ]
  },
  {
    slug: "note-05",
    number: "05",
    title: "Note 05",
    date: "2026-01-05",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 05 placeholder."
    ]
  },
  {
    slug: "note-06",
    number: "06",
    title: "Note 06",
    date: "2026-01-06",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 06 placeholder."
    ]
  },
  {
    slug: "note-07",
    number: "07",
    title: "Note 07",
    date: "2026-01-07",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 07 placeholder."
    ]
  },
  {
    slug: "note-08",
    number: "08",
    title: "Note 08",
    date: "2026-01-08",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 08 placeholder."
    ]
  },
  {
    slug: "note-09",
    number: "09",
    title: "Note 09",
    date: "2026-01-09",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 09 placeholder."
    ]
  },
  {
    slug: "note-10",
    number: "10",
    title: "Note 10",
    date: "2026-01-10",
    excerpt: "Placeholder for an earlier note.",
    body: [
      "Note 10 placeholder."
    ]
  }
];

export function getLatestNotes(count = 3) {
  return notes.slice(0, count);
}

export function getNoteBySlug(slug: string) {
  return notes.find((note) => note.slug === slug);
}

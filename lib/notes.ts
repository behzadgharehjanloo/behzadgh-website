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
    title: "Title placeholder",
    date: "2026-01-01",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-02",
    number: "02",
    title: "Title placeholder",
    date: "2026-01-02",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-03",
    number: "03",
    title: "Title placeholder",
    date: "2026-01-03",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-04",
    number: "04",
    title: "Title placeholder",
    date: "2026-01-04",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-05",
    number: "05",
    title: "Title placeholder",
    date: "2026-01-05",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-06",
    number: "06",
    title: "Title placeholder",
    date: "2026-01-06",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-07",
    number: "07",
    title: "Title placeholder",
    date: "2026-01-07",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-08",
    number: "08",
    title: "Title placeholder",
    date: "2026-01-08",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-09",
    number: "09",
    title: "Title placeholder",
    date: "2026-01-09",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  },
  {
    slug: "note-10",
    number: "10",
    title: "Title placeholder",
    date: "2026-01-10",
    excerpt: "Short description placeholder.",
    body: [
      "This note is a placeholder for now."
    ]
  }
];

export function getLatestNotes(count = 3) {
  return notes.slice(0, count);
}

export function getNoteBySlug(slug: string) {
  return notes.find((note) => note.slug === slug);
}

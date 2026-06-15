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
    slug: "the-photo-albums",
    number: "001",
    title: "XXXX",
    date: "2026-01-08",
    excerpt: "IN PROGRESS.",
    body: [
      "IN PROGRESS."
    ]
  },
  {
    slug: "uncle-hossein",
    number: "002",
    title: "XXXX",
    date: "2026-01-15",
    excerpt: "IN PROGRESS.",
    body: [
      "IN PROGRESS."
    ]
  },
  {
    slug: "the-camera",
    number: "003",
    title: "XXXX",
    date: "2026-01-22",
    excerpt: "IN PROGRESS.",
    body: [
      "IN PROGRESS."
    ]
  }
];

export function getLatestNotes(count = 3) {
  return notes.slice(0, count);
}

export function getNoteBySlug(slug: string) {
  return notes.find((note) => note.slug === slug);
}

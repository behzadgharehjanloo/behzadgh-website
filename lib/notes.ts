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
    title: "The Photo Albums",
    date: "2026-01-08",
    excerpt: "A quiet note about what remains visible when photographs are gathered together.",
    body: [
      "This is a placeholder for a full note about the photo albums.",
      "The finished piece can hold memory, description, and the small details that make a photograph feel alive without needing to explain everything at once."
    ]
  },
  {
    slug: "uncle-hossein",
    number: "002",
    title: "Uncle Hossein",
    date: "2026-01-15",
    excerpt: "A beginning for a remembered person, written simply and with care.",
    body: [
      "This is a placeholder for a full note about Uncle Hossein.",
      "The final note can be personal, direct, and observant, leaving enough room for both tenderness and plain fact."
    ]
  },
  {
    slug: "the-camera",
    number: "003",
    title: "The Camera",
    date: "2026-01-22",
    excerpt: "A short reflection on the object, the habit, and the act of looking.",
    body: [
      "This is a placeholder for a full note about the camera.",
      "The completed version can move from object to memory, from handling the camera to noticing what it made possible."
    ]
  }
];

export function getLatestNotes(count = 3) {
  return notes.slice(0, count);
}

export function getNoteBySlug(slug: string) {
  return notes.find((note) => note.slug === slug);
}

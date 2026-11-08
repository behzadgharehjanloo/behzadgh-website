export const preferredNameTemplate: string;
export function parsePreferredName(value: unknown): { value: string | null; error?: never } | { error: string; value?: never };
export function preferredNameGreeting(value?: unknown): string;
export function preferredNameSnapshot(value?: unknown): Readonly<{ preferredName: string | null; greeting: string }>;
export function escapeEmailHtml(value: string): string;

export type EmailOutboxSummary = { processed: number; sent: number; retained: number; cancelled: number };
export function processEmailOutbox(limit?: number): Promise<EmailOutboxSummary>;

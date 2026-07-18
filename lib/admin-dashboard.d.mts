export const ADMIN_PAGE_SIZE: number;
export const ADMIN_STATUSES: string[];
export type AdminFilters = { page: number; search: string; status: string };
export type AdminSubscriber = {
  id: string | number;
  email: string;
  status: string;
  created_at: string | number;
  consent_source: string;
  welcome_sent_at: string | number | null;
  unsubscribed_at: string | number | null;
  welcome_status: string;
};
export function parseAdminFilters(input?: Record<string, string | string[] | undefined>): AdminFilters;
export function subscriberWhere(filters: AdminFilters, alias?: string): { sql: string; params: unknown[] };
export function normalizeSubscriberSummary(row?: Record<string, unknown>, outbox?: Record<string, unknown>): Record<string, number>;
export function loadAdminDashboard(
  query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>,
  filters: AdminFilters
): Promise<{
  summary: Record<string, number>;
  subscribers: AdminSubscriber[];
  growth: Array<{ day: string; count: number }>;
  filteredCount: number;
  pageCount: number;
  page: number;
}>;
export function loadAdminCsvRows(
  query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>,
  filters: AdminFilters
): Promise<Record<string, unknown>[]>;
export function csvEscape(value: unknown): string;
export function subscribersToCsv(rows: Record<string, unknown>[]): string;

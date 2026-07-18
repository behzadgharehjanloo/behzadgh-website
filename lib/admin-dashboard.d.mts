export const ADMIN_PAGE_SIZE: number;
export const ADMIN_STATUSES: string[];
export const ADMIN_RANGES: string[];
export const AUDIENCE_MILESTONES: number[];

export type AdminFilters = {
  page: number;
  search: string;
  status: string;
  source: string;
  range: string;
};

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

export type Overview = {
  total: number;
  active: number;
  pending: number;
  unsubscribed: number;
  suppressed: number;
  today: number;
  current7: number;
  previous7: number;
  thisMonth: number;
  previousMonth: number;
  netThisMonth: number;
  netPreviousMonth: number;
  net30Days: number;
  net90Days: number;
  activeAtMonthStart: number;
  growthRateThisMonth: number | null;
  welcomeDeliveryRate: number | null;
  unsubscribeRate: number | null;
  firstSubscriberAt: number | null;
  lastSubscriberAt: number | null;
  generatedAt: number;
  trackingDays: number;
};

export type DeliveryHealth = {
  sent: number;
  queued: number;
  failed: number;
  total: number;
  deliveryRate: number | null;
  mostRecentSentAt: number | null;
  mostRecentFailureAt: number | null;
  databaseStatus: string;
  gmailStatus: string;
  queueStatus: string;
};

export type SourceShare = { source: string; count: number; share: number };
export type GrowthPoint = { day: string; signups: number; active: number };
export type RecentActivity = { type: string; email: string; occurredAt: number };

export function safePercent(numerator: unknown, denominator: unknown): number | null;
export function comparePeriods(current: unknown, previous: unknown): {
  current: number;
  previous: number;
  change: number;
  percentChange: number | null;
};
export function parseAdminFilters(input?: Record<string, string | string[] | undefined>): AdminFilters;
export function subscriberWhere(filters: AdminFilters, alias?: string): { sql: string; params: unknown[] };
export function normalizeOverview(row?: Record<string, unknown>, delivery?: Record<string, unknown>): Overview;
export function normalizeSubscriberSummary(row?: Record<string, unknown>, outbox?: Record<string, unknown>): Record<string, number>;
export function normalizeDeliveryHealth(row?: Record<string, unknown>): DeliveryHealth;
export function calculateSourceShares(rows?: Record<string, unknown>[]): SourceShare[];
export function chooseGrowthRange(requestedRange: string, overview: Overview): string;
export function buildGrowthSeries(rows?: Record<string, unknown>[], startingActive?: number): GrowthPoint[];
export function normalizeRecentActivity(rows?: Record<string, unknown>[]): RecentActivity[];
export function calculateMilestones(total: number, rows?: Record<string, unknown>[]): {
  milestones: Array<{ target: number; achieved: boolean; achievedAt: number | null }>;
  next: { target: number; achieved: boolean; achievedAt: number | null } | null;
  progress: number;
};
export function buildAudienceSnapshot(overview: Overview, sources: SourceShare[], delivery: DeliveryHealth): {
  trackingStartAt: number | null;
  activeSubscribers: number;
  net30Days: number;
  net90Days: number;
  averageMonthlyNetGrowth: number | null;
  welcomeDeliveryRate: number | null;
  unsubscribeRate: number | null;
  primarySource: string | null;
};
export function loadAdminDashboard(
  query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>,
  filters: AdminFilters
): Promise<{
  overview: Overview;
  delivery: DeliveryHealth;
  sources: SourceShare[];
  growth: GrowthPoint[];
  recentActivity: RecentActivity[];
  milestones: ReturnType<typeof calculateMilestones>;
  audienceSnapshot: ReturnType<typeof buildAudienceSnapshot>;
  velocity: { weekly: ReturnType<typeof comparePeriods>; monthly: ReturnType<typeof comparePeriods> };
  subscribers: AdminSubscriber[];
  filteredCount: number;
  pageCount: number;
  page: number;
  selectedRange: string;
}>;
export function loadAdminCsvRows(
  query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>,
  filters: AdminFilters
): Promise<Record<string, unknown>[]>;
export function csvEscape(value: unknown): string;
export function subscribersToCsv(rows: Record<string, unknown>[]): string;

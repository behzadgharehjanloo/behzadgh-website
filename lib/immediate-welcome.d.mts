export type ImmediateWelcomeRecord = {
  subscriberId: string | number;
  outboxId: string | number;
  workerId: string;
  email: string;
  unsubscribeNonce: string;
};
export function deliverImmediateWelcome(record: ImmediateWelcomeRecord, dependencies: { query: (text: string, params?: unknown[]) => Promise<unknown> }): Promise<"sent" | "queued">;

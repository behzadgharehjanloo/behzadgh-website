export type ImmediateConfirmationRecord = {
  subscriberId: string | number;
  email: string;
  confirmationNonce: string | null;
};
export function deliverImmediateConfirmation(
  record: ImmediateConfirmationRecord,
  dependencies: { query: (text: string, params?: unknown[]) => Promise<unknown[]> }
): Promise<"sent" | "queued" | "unavailable" | "already_processing_or_queued">;

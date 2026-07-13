export function emailTokenSecretConfigured(): boolean;
export function deriveEmailToken(purpose: "confirm" | "unsubscribe", identity: string, nonce: string): string;

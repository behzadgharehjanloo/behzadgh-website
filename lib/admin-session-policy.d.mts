export const SESSION_TTL_SECONDS: number;
export function adminCookiePolicy(environment?: NodeJS.ProcessEnv): {
  name: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: "strict";
    path: "/";
    maxAge: number;
  };
};
export function adminSessionIsValid(expiresAt: string | number | null | undefined, now?: number): boolean;

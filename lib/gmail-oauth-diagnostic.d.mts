export declare function runGmailOauthDiagnostic(request: Request): Promise<Response>;
export declare function runAuthorizedGmailOauthDiagnostic(options?: {environment?: NodeJS.ProcessEnv; refreshAccessToken?: () => Promise<void>; timestamp?: boolean}): Promise<Response>;

export type MimeAttachment={filename:string;content:Buffer;contentType:string;cid:string};
export function buildRawMessage(input:{to:string;subject:string;text:string;html:string;unsubscribeUrl?:string;attachments?:MimeAttachment[];messageKey?:string}):Promise<Buffer>;
export function getGmailService():unknown;
export function getSingleAttemptGmailService():Promise<unknown>;
export function refreshGmailAccessToken(oauth?:unknown,options?:{timeoutMs?:number}):Promise<string>;
export function sendWithGmailApi(message:Buffer,gmail?:unknown):Promise<string>;
export function sanitizeGmailOauthFailure(error:unknown):{category:string;httpStatus?:number;oauthError?:string};

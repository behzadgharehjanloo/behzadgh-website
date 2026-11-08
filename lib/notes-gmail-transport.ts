import 'server-only';
import {getSingleAttemptGmailService} from '@/lib/gmail-service.mjs';

export type FakeResult={outcome:'accepted';providerId:string}|{outcome:'known_rejection';retryable:boolean}|{outcome:'ambiguous'};
export type NotesTransport={kind:'deterministic-fake'|'gmail';send(id:string,raw:Buffer):Promise<FakeResult>};
export const NOTES_GMAIL_SCOPE='https://www.googleapis.com/auth/gmail.send';
type GmailClient={users:{messages:{send:(request:{userId:string;requestBody:{raw:string}},options:{timeout:number;retry:boolean;retryConfig:{retry:number}})=>Promise<{status?:number;data?:{id?:unknown}}>}}};
export function classifyNotesGmailError(error:unknown):FakeResult{
 const response=(error as {response?:{status?:unknown;data?:{error?:{code?:unknown;errors?:{reason?:unknown}[]}}}})?.response;
 const status=response?.status,provider=response?.data?.error;
 // Only an explicit structured API rejection proves non-acceptance. A timeout,
 // proxy HTML error, HTTP 408/5xx, missing ID or lost response remains uncertain.
 if(typeof status==='number'&&provider?.code===status&&[400,401,403,404,413,429].includes(status)){
  const reasons=Array.isArray(provider.errors)?provider.errors.map(e=>e?.reason):[];
  return {outcome:'known_rejection',retryable:status===429||(status===403&&reasons.some(r=>r==='rateLimitExceeded'||r==='userRateLimitExceeded'))};
 }
 return {outcome:'ambiguous'};
}
export function createGuardedNotesGmailTransport(authorize:()=>void):NotesTransport{
 return {kind:'gmail',async send(_id,raw){
  // Callsite authorization runs BEFORE constructing OAuth/client state.
  // Studio gates and the standalone Admin opt-in remain independent.
  authorize();
  let gmail:GmailClient;
  try{gmail=await getSingleAttemptGmailService() as GmailClient;}catch{return {outcome:'known_rejection',retryable:false};}
  try{
   const response=await gmail.users.messages.send({userId:'me',requestBody:{raw:raw.toString('base64url')}},{timeout:20000,retry:false,retryConfig:{retry:0}});
   const id=response.data?.id;
   if((response.status===undefined||(response.status>=200&&response.status<300))&&typeof id==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(id))return {outcome:'accepted',providerId:id};
   return {outcome:'ambiguous'};
  }catch(error){return classifyNotesGmailError(error);}
 }};
}

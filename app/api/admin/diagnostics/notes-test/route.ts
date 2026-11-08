import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {isSameOriginPost} from '@/lib/request-security';
import {boundedJson} from '@/lib/request-body';
import {adminNotesTests,adminNotesTestEnabled,AdminTestError} from '@/lib/admin-notes-test';
export const dynamic='force-dynamic';export const runtime='nodejs';export const maxDuration=60;
const headers={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
export async function POST(request:Request){
 if(new URL(request.url).search||!isSameOriginPost(request)||request.headers.get('x-admin-notes-test')!=='confirm-flow'||request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return json({error:'Forbidden.'},403);
 try{if(!await isAdminAuthenticatedReadOnly())return json({error:'Sign in to the website Admin.'},401);}catch{return json({error:'Admin authentication unavailable.'},503);}
 if(!adminNotesTestEnabled())return json({error:'Admin test email is disabled.'},503);
 let body:Record<string,unknown>;
 try{body=await boundedJson(request,2048) as Record<string,unknown>;}catch{return json({error:'Invalid JSON request or request exceeds 2 KB.'},400);}
 try{
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['action','id','recipient','snapshotId','confirm'].includes(k)))return json({error:'Invalid test request.'},400);
  const service=adminNotesTests();
  if(body.action==='prepare')return json({test:await service.prepare(body.recipient,body.id)});
  if(body.action==='confirm')return json({test:await service.confirm(body)});
  if(body.action==='status')return json({test:await service.status(body.id)});
  return json({error:'Choose prepare, confirm or status.'},400);
 }catch(error){return error instanceof AdminTestError?json({error:error.message},400):json({error:'The request could not be recorded. If confirmation was submitted, do not send again; check the attempt status.'},503);}
}

import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {isSameOriginPost} from '@/lib/request-security';
import {boundedJson} from '@/lib/request-body';
import {studioEnabled} from '@/lib/notes-studio';
import {cloudEnabled} from '@/lib/notes-cloud-s3';
import {beginOriginalPhotoUpload,finalizeOriginalPhotoUpload} from '@/lib/notes-cloud-photo';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex,nofollow','X-Content-Type-Options':'nosniff'};
const json=(payload:unknown,status=200)=>Response.json(payload,{status,headers});
export async function POST(request:Request){
 if(!isSameOriginPost(request)||request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'Forbidden'},403);
 try{if(!await isAdminAuthenticatedReadOnly())return json({error:'Sign in to Admin'},401);}catch{return json({error:'Auth unavailable'},503);}
 if(!studioEnabled()||!cloudEnabled())return json({error:'Original photograph cloud is not enabled'},503);
 let body:Record<string,unknown>;
 try{const data=await boundedJson(request,2048);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();body=data as Record<string,unknown>;}catch{return json({error:'Invalid photo request'},400);}
 try{
  if(body.action==='begin')return json(await beginOriginalPhotoUpload(body.noteId,body.revision,body.size,body.mime,body.sha256));
  if(body.action==='finalize')return json({note:await finalizeOriginalPhotoUpload(body.uploadId,body.noteId,body.alt)});
  return json({error:'Unknown photo action'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Photo upload failed'},400);}
}

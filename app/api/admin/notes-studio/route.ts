import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {isSameOriginPost} from '@/lib/request-security';
import {boundedJson} from '@/lib/request-body';
import {studioEnabled,saveStudioDraft,scheduleStudioNote,cancelScheduledNote,setStudioPaused,getStudioNote,listStudioRevisions,previewStudioNote} from '@/lib/notes-studio';
import {prepareStudioTest,confirmStudioTest} from '@/lib/notes-studio-test';
import {publishDueNotes,dispatchStudioEmails} from '@/lib/notes-studio-worker';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive'};
function json(body:unknown,status=200){return Response.json(body,{status,headers});}
export async function POST(request:Request){
 if(!isSameOriginPost(request)||request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return json({error:'Forbidden.'},403);
 try{if(!await isAdminAuthenticatedReadOnly())return json({error:'Sign in to Admin.'},401);}catch{return json({error:'Authentication unavailable.'},503);}
 if(!studioEnabled())return json({error:'Notes Studio requires the reviewed migration and Production feature flag.'},503);
 let body:Record<string,unknown>;
 try{const value=await boundedJson(request,35000);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();body=value as Record<string,unknown>;}
 catch{return json({error:'Invalid or oversized request.'},400);}
 try{
  if(body.action==='save')return json({note:await saveStudioDraft(body.draft,body.id,body.revision)});
  if(body.action==='history')return json({revisions:await listStudioRevisions(body.id)});
  if(body.action==='preview'){
   const note=body.id?await getStudioNote(String(body.id)):null;
   if(!note)throw Error('Save a draft before previewing.');
   return json({subject:note.title,html:previewStudioNote(note).html});
  }
  if(body.action==='schedule'){
   if(body.confirm!==true)throw Error('Confirm the exact scheduled time.');
   return json({note:await scheduleStudioNote(body.id,body.scheduledAt,body.revision)});
  }
  if(body.action==='cancel')return json({note:await cancelScheduledNote(body.id)});
  if(body.action==='pause')return json({note:await setStudioPaused(body.id,body.paused)});
  if(body.action==='testPrepare')return json({test:await prepareStudioTest(body.id,body.recipient)});
  if(body.action==='testConfirm'){
   if(body.confirm!==true)throw Error('Explicit confirmation is required.');
   return json({test:await confirmStudioTest(body.testId,body.recipient)});
  }
  if(body.action==='dispatch'){
   if(body.confirm!==true)throw Error('Explicit confirmation is required.');
   const published=await publishDueNotes();
   const delivery=await dispatchStudioEmails(2);
   return json({published,delivery});
  }
  return json({error:'Unknown action.'},400);
 }catch(error){
  return json({error:error instanceof Error?error.message:'Operation unavailable.'},400);
 }
}

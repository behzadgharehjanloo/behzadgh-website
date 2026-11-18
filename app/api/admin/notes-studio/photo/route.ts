import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {isSameOriginPost} from '@/lib/request-security';
import {studioEnabled} from '@/lib/notes-studio';
import {saveStudioPhotograph,readStudioPhotograph} from '@/lib/notes-photo-store';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'};
function json(value:unknown,status=200){return Response.json(value,{status,headers});}
async function authorized(){try{return studioEnabled()&&await isAdminAuthenticatedReadOnly();}catch{return false;}}
export async function GET(request:Request){
 if(!await authorized())return json({error:'Unauthorized'},401);
 const url=new URL(request.url);
 try{
  const photo=await readStudioPhotograph(url.searchParams.get('noteId'),url.searchParams.get('assetId'));
  if(!photo)return json({error:'Photograph unavailable'},404);
  return new Response(new Uint8Array(photo.bytes),{status:200,headers:{...headers,'Content-Type':photo.mimeType,'Content-Disposition':'inline','Content-Length':String(photo.bytes.length)}});
 }catch{return json({error:'Photograph unavailable'},404);}
}
export async function POST(request:Request){
 if(!isSameOriginPost(request)||!await authorized())return json({error:'Forbidden'},403);
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data'))return json({error:'Expected a photograph upload'},415);
 const length=Number(request.headers.get('content-length')??0);
 if(!Number.isFinite(length)||length>3_500_000)return json({error:'Photograph upload is too large'},413);
 try{
  const data=await request.formData();
  const photo=data.get('photograph');
  if(!(photo instanceof File)||photo.size<1||photo.size>3*1024*1024)return json({error:'Use a JPEG or PNG under 3 MB'},400);
  const noteId=data.get('noteId'),revision=data.get('revision'),alt=data.get('alt');
  const result=await saveStudioPhotograph(noteId,typeof revision==='string'&&/^\d+$/.test(revision)?Number(revision):NaN,
   Buffer.from(await photo.arrayBuffer()),photo.type,alt);
  return json({note:result});
 }catch(error){return json({error:error instanceof Error?error.message:'Photograph upload failed'},400);}
}

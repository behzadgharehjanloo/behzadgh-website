import {timingSafeEqual} from 'node:crypto';
import {studioEnabled,publicDeliveryEnabled} from '@/lib/notes-studio';
import {publishDueNotes,dispatchStudioEmails} from '@/lib/notes-studio-worker';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
function authorized(request:Request){
 const secret=process.env.CRON_SECRET,provided=request.headers.get('authorization');
 if(!secret||!provided)return false;
 const a=Buffer.from('Bearer '+secret),b=Buffer.from(provided);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export async function GET(request:Request){
 if(!authorized(request))return Response.json({ok:false},{status:401});
 if(!studioEnabled()||!publicDeliveryEnabled())return Response.json({ok:true,disabled:true},{headers:{'Cache-Control':'no-store'}});
 try{
  const published=await publishDueNotes(5);
  // Two serial attempts cap execution under Hobby's short function budget.
  // For large audiences use an independently reviewed queue runner before activation.
  const delivery=await dispatchStudioEmails(2);
  return Response.json({ok:true,published,delivery},{headers:{'Cache-Control':'no-store'}});
 }catch{
  console.error('Notes Studio publisher invocation failed.');
  return Response.json({ok:false},{status:500,headers:{'Cache-Control':'no-store'}});
 }
}

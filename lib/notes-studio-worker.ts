import 'server-only';
import {randomUUID} from 'node:crypto';
import {query} from './database';
import {deriveEmailToken} from './email-tokens.mjs';
import {buildRawMessage} from './gmail-service.mjs';
import {createGuardedNotesGmailTransport} from './notes-gmail-transport';
import {requirePublicDelivery} from './notes-studio';

// Every transition is protected by a database claim. Uncertain Gmail outcomes
// are terminal NEEDS REVIEW; never automatically resend a possibly accepted mail.
export async function publishDueNotes(maxNotes=5){
 requirePublicDelivery();
 const due=await query<{id:string}>(`SELECT id FROM studio_notes
 WHERE state='scheduled' AND paused=FALSE AND scheduled_at<=NOW()
 ORDER BY scheduled_at LIMIT $1`,[maxNotes]);
 let published=0;
 for(const note of due){
  const rows=await query<{id:string}>(`
   WITH published AS (
    UPDATE studio_notes SET state='published',published_at=NOW(),updated_at=NOW()
    WHERE id=$1 AND state='scheduled' AND paused=FALSE AND scheduled_at<=NOW()
    RETURNING id
   ), enrolled AS (
    INSERT INTO studio_deliveries(note_id,subscriber_id)
    SELECT published.id,s.id FROM published CROSS JOIN subscribers s
    WHERE s.status='active' AND s.unsubscribe_nonce IS NOT NULL
    ON CONFLICT(note_id,subscriber_id) DO NOTHING
    RETURNING id
   ) SELECT id FROM published`,[note.id]);
  published+=rows.length;
 }
 return published;
}
type Delivery={id:string;note_id:string;email:string;unsubscribe_nonce:string|null;subscriber_status:string;
 title:string;body:string;image_alt:string;note_state:string;paused:boolean};
export async function dispatchStudioEmails(limit=8){
 requirePublicDelivery();
 const summary={claimed:0,accepted:0,cancelled:0,needsReview:0,failed:0};
 const transport=createGuardedNotesGmailTransport(requirePublicDelivery);
 // One worker cannot automatically retry a stalled Gmail call. Mark the
 // abandoned attempt as uncertain and reserve it for manual investigation.
 await query(`UPDATE studio_deliveries SET state='needs_review',error_category='lease_expired',
 finished_at=NOW(),worker_token=NULL,lease_until=NULL
 WHERE state='sending' AND lease_until<=NOW()`);
 for(let i=0;i<Math.min(limit,12);i++){
  const token=randomUUID();
  const claim=await query<{id:string}>(`UPDATE studio_deliveries d
    SET state='sending',worker_token=$1,started_at=NOW(),lease_until=NOW()+INTERVAL '90 seconds'
    WHERE d.id=(SELECT x.id FROM studio_deliveries x JOIN studio_notes n ON n.id=x.note_id
    WHERE x.state='queued' AND n.state='published' AND n.paused=FALSE
    ORDER BY x.id FOR UPDATE OF x SKIP LOCKED LIMIT 1)
    AND d.state='queued' RETURNING d.id`,[token]);
  if(!claim.length)break;
  const deliveryId=claim[0].id;
  summary.claimed++;
  const rows=await query<Delivery>(`SELECT d.id,d.note_id,s.email,s.unsubscribe_nonce,s.status AS subscriber_status,
    n.title,n.body,n.image_alt,n.state AS note_state,n.paused
    FROM studio_deliveries d JOIN subscribers s ON s.id=d.subscriber_id
    JOIN studio_notes n ON n.id=d.note_id WHERE d.id=$1 AND d.worker_token=$2`,[deliveryId,token]);
  const row=rows[0];
  if(!row||row.subscriber_status!=='active'||!row.unsubscribe_nonce||row.note_state!=='published'||row.paused){
   await query(`UPDATE studio_deliveries SET state='cancelled',finished_at=NOW(),worker_token=NULL,lease_until=NULL
     WHERE id=$1 AND worker_token=$2 AND state='sending'`,[deliveryId,token]);
   summary.cancelled++;continue;
  }
  try{
   const unsubscribeToken=deriveEmailToken('unsubscribe',row.email,row.unsubscribe_nonce);
   const humanUrl=`https://behzadgh.com/unsubscribe/${unsubscribeToken}`;
   const apiUrl=`https://behzadgh.com/api/unsubscribe/${unsubscribeToken}`;
   // Render a per-recipient unsubscribe link; the Note text remains untouched.
   const {renderStudioEmail}=await import('./notes-email');
   const individual=renderStudioEmail({title:row.title,rawText:row.body,imageAlt:row.image_alt},undefined,{unsubscribeUrl:humanUrl});
   const raw=await buildRawMessage({to:row.email,subject:individual.subject,text:individual.text,
    html:individual.html,unsubscribeUrl:apiUrl,messageKey:`studio:${deliveryId}`});
   const result=await transport.send(deliveryId,raw);
   const state=result.outcome==='accepted'?'accepted':result.outcome==='known_rejection'?'failed':'needs_review';
   const saved=await query<{id:string}>(`UPDATE studio_deliveries SET state=$3,
    gmail_message_id=$4,error_category=$5,finished_at=NOW(),worker_token=NULL,lease_until=NULL
    WHERE id=$1 AND worker_token=$2 AND state='sending' AND lease_until>NOW() RETURNING id`,
    [deliveryId,token,state,result.outcome==='accepted'?result.providerId:null,
     result.outcome==='accepted'?null:result.outcome==='known_rejection'?'known_rejection':'ambiguous']);
   if(!saved.length){summary.needsReview++;continue;}
   if(state==='accepted')summary.accepted++;
   else if(state==='failed')summary.failed++;
   else summary.needsReview++;
  }catch{
   await query(`UPDATE studio_deliveries SET state='needs_review',error_category='ambiguous',
    finished_at=NOW(),worker_token=NULL,lease_until=NULL
    WHERE id=$1 AND worker_token=$2 AND state='sending'`,[deliveryId,token]);
   summary.needsReview++;
  }
 }
 return summary;
}

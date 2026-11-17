import 'server-only';
import {randomUUID} from 'node:crypto';
import {query} from './database';
import {normalizeEmail} from './email-address.mjs';
import {renderStudioEmail} from './notes-email';
import {buildRawMessage} from './gmail-service.mjs';
import {createGuardedNotesGmailTransport} from './notes-gmail-transport';
import {getStudioNote,requireStudio} from './notes-studio';

export async function prepareStudioTest(noteId:unknown,recipient:unknown){
 requireStudio();
 const email=typeof recipient==='string'?normalizeEmail(recipient):null;
 if(typeof noteId!=='string'||!email)throw new Error('Choose a Note and one valid recipient.');
 const note=await getStudioNote(noteId);
 if(!note||!['draft','scheduled'].includes(note.state))throw new Error('Only unpublished Notes can be tested.');
 const id=randomUUID();
 const rows=await query<{id:string;recipient:string;note_id:string;snapshot_revision:number;state:string}>(`
  INSERT INTO studio_test_sends(id,note_id,recipient,snapshot_revision)
  VALUES($1,$2,$3,$4)
  RETURNING id,recipient,note_id,snapshot_revision,state`,[id,note.id,email,note.revision]);
 return {...rows[0],subject:`[TEST] ${note.title}`};
}
export async function confirmStudioTest(id:unknown,recipient:unknown){
 requireStudio();
 if(typeof id!=='string'||typeof recipient!=='string')throw new Error('Invalid test send.');
 const record=(await query<{id:string;note_id:string;recipient:string;snapshot_revision:number;state:string}>(`
 SELECT id,note_id,recipient,snapshot_revision,state
 FROM studio_test_sends WHERE id=$1`,[id]))[0];
 if(!record||record.recipient!==recipient||record.state!=='prepared')throw new Error('This test is no longer available.');
 const note=await getStudioNote(record.note_id);
 if(!note||note.revision!==record.snapshot_revision||!['draft','scheduled'].includes(note.state))throw new Error('The Note changed. Prepare a new test.');
 const content=renderStudioEmail({title:note.title,rawText:note.body,imageAlt:note.image_alt});
 const mime=await buildRawMessage({to:recipient,subject:`[TEST] ${content.subject}`,
   html:content.html,text:content.text,messageKey:`studio-test:${record.id}`});
 const worker=randomUUID();
 const claimed=await query<{id:string}>(`UPDATE studio_test_sends
  SET state='sending',worker_token=$2,started_at=NOW()
  WHERE id=$1 AND state='prepared' AND recipient=$3 AND snapshot_revision=$4 AND expires_at>NOW()
  RETURNING id`,[id,worker,recipient,note.revision]);
 if(!claimed.length)throw new Error('The test expired or was already attempted.');
 let outcome:'accepted'|'failed'|'needs_review'='needs_review',gmailId:string|null=null;
 try{
  const result=await createGuardedNotesGmailTransport(requireStudio).send(id,mime);
  outcome=result.outcome==='accepted'?'accepted':result.outcome==='known_rejection'?'failed':'needs_review';
  if(result.outcome==='accepted')gmailId=result.providerId;
 }catch{outcome='needs_review';}
 const saved=await query<{state:string}>(`UPDATE studio_test_sends SET state=$3,
  gmail_message_id=$4,error_category=$5,finished_at=NOW(),worker_token=NULL
  WHERE id=$1 AND worker_token=$2 AND state='sending' RETURNING state`,
 [id,worker,outcome,gmailId,outcome==='accepted'?null:outcome==='failed'?'known_rejection':'ambiguous']);
 if(!saved.length)throw new Error('Gmail result is uncertain; do not resend this attempt.');
 return {id,state:saved[0].state,gmailAcceptedIdRecorded:Boolean(gmailId)};
}

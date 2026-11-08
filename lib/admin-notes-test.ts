import 'server-only';
import {randomUUID} from 'node:crypto';
import {query} from './database';
import {normalizeEmail} from './email-address.mjs';
import {adminTestSnapshot,buildAdminTestMime} from './admin-notes-test-snapshot';
import {createGuardedNotesGmailTransport,type NotesTransport,type FakeResult} from './notes-gmail-transport';

export type TestQuery=<T>(sql:string,params?:unknown[])=>Promise<T[]>;
export type TestSend={id:string;recipient:string;snapshotId:string;subject:string;state:string;expiresAt:string;gmailMessageId:string|null;errorCategory:string|null;createdAt:string};
export class AdminTestError extends Error {}
const validId=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function adminNotesTestEnabled(env:NodeJS.ProcessEnv=process.env){return env.ADMIN_NOTES_TEST_EMAIL_ENABLED==='1'&&env.VERCEL_ENV==='production'&&env.NODE_ENV==='production';}
function requireEnabled(){if(!adminNotesTestEnabled())throw new AdminTestError('Admin test email is disabled.');}
const fields=`id,recipient,snapshot_id AS "snapshotId",subject,state,expires_at::text AS "expiresAt",gmail_message_id AS "gmailMessageId",error_category AS "errorCategory",created_at::text AS "createdAt"`;
export function adminNotesTests(db:TestQuery=query){
 const get=async(id:string)=>(await db<TestSend>(`SELECT ${fields} FROM admin_notes_test_sends WHERE id=$1`,[id]))[0]??null;
 const recover=async(id:string)=>{await db(`UPDATE admin_notes_test_sends SET state='needs_review',error_category='lease_expired',finished_at=NOW(),worker_token=NULL,lease_until=NULL WHERE id=$1 AND state='sending' AND lease_until<=NOW()`,[id]);};
 return {
  async prepare(recipient:unknown,id:unknown){
   requireEnabled();const email=typeof recipient==='string'?normalizeEmail(recipient):null;
   if(!email||!validId(id))throw new AdminTestError('Enter exactly one valid recipient address.');
   const snap=adminTestSnapshot();
   await db(`INSERT INTO admin_notes_test_sends(id,recipient,snapshot_id,image_sha256,subject) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`,[id,email,snap.snapshotId,snap.imageSha256,snap.subject]);
   const row=await get(id);if(!row||row.recipient!==email||row.snapshotId!==snap.snapshotId)throw new AdminTestError('This preparation changed. Review a new test.');
   return row;
  },
  async status(id:unknown){requireEnabled();if(!validId(id))throw new AdminTestError('Invalid test identifier.');await recover(id);return get(id);},
  async history(){requireEnabled();return db<TestSend>(`SELECT ${fields},CASE WHEN state='sending' AND lease_until<=NOW() THEN 'needs_review' ELSE state END AS state FROM admin_notes_test_sends ORDER BY created_at DESC LIMIT 10`);},
  async confirm(input:{id?:unknown;recipient?:unknown;snapshotId?:unknown;confirm?:unknown},transport:NotesTransport=createGuardedNotesGmailTransport(requireEnabled)){
   requireEnabled();const {id,recipient,snapshotId,confirm}=input;
   if(!validId(id)||typeof recipient!=='string'||normalizeEmail(recipient)!==recipient||confirm!==true||typeof snapshotId!=='string')throw new AdminTestError('Review and explicitly confirm the exact destination.');
   await recover(id);const row=await get(id);
   if(!row||row.recipient!==recipient||row.snapshotId!==snapshotId||snapshotId!==adminTestSnapshot().snapshotId)throw new AdminTestError('The destination or snapshot changed. Prepare a new test.');
   if(row.state!=='prepared')return row;
   if(new Date(row.expiresAt).getTime()<=Date.now())throw new AdminTestError('This confirmation expired. Prepare a new test.');
   const raw=await buildAdminTestMime(recipient,id),worker=randomUUID();
   const claimed=await db<{id:string}>(`UPDATE admin_notes_test_sends SET state='sending',started_at=NOW(),lease_until=NOW()+INTERVAL '90 seconds',worker_token=$2 WHERE id=$1 AND recipient=$3 AND snapshot_id=$4 AND state='prepared' AND expires_at>NOW() RETURNING id`,[id,worker,recipient,snapshotId]);
   if(!claimed.length)return get(id);
   let outcome:FakeResult,timer:ReturnType<typeof setTimeout>|undefined;
   try{outcome=await Promise.race([transport.send(id,raw),new Promise<FakeResult>(resolve=>{timer=setTimeout(()=>resolve({outcome:'ambiguous'}),25000);})]);}catch{outcome={outcome:'ambiguous'};}finally{if(timer)clearTimeout(timer);}
   if(outcome.outcome==='accepted'&&!/^[A-Za-z0-9_-]{1,120}$/.test(outcome.providerId))outcome={outcome:'ambiguous'};
   const state=outcome.outcome==='accepted'?'accepted':outcome.outcome==='known_rejection'?'failed':'needs_review';
   const saved=await db<{id:string}>(`UPDATE admin_notes_test_sends SET state=$3,finished_at=NOW(),gmail_message_id=$4,error_category=$5,worker_token=NULL,lease_until=NULL WHERE id=$1 AND worker_token=$2 AND state='sending' AND lease_until>NOW() RETURNING id`,[id,worker,state,outcome.outcome==='accepted'?outcome.providerId:null,outcome.outcome==='accepted'?null:outcome.outcome==='known_rejection'?'known_rejection':'ambiguous']);
   if(!saved.length)throw new AdminTestError('Outcome uncertain. Do not send again; check this attempt status.');
   return get(id);
  }
 };
}

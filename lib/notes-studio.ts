import 'server-only';
import {randomUUID} from 'node:crypto';
import {query} from './database';
import {renderStudioEmail} from './notes-email';
import {validateFraming,type Framing} from './notes-framing';

export type StudioNote = {
 id:string;slug:string;title:string;body:string;image_alt:string;
 narrator:'Behzad'|'Steven';excerpt:string;image_caption:string;seo_description:string;
 state:'draft'|'scheduled'|'published'|'cancelled';paused:boolean;
 scheduled_at:string|null;published_at:string|null;revision:number;
 created_at:string;updated_at:string;photo_id:string|null;photo_framing:Framing|null;
};

export function studioEnabled(env:NodeJS.ProcessEnv=process.env){
 return env.NOTES_STUDIO_ENABLED==='1' && env.VERCEL_ENV==='production' && env.NODE_ENV==='production';
}
export function requireStudio(){if(!studioEnabled())throw new Error('Notes Studio is not activated.');}
export function publicDeliveryEnabled(env:NodeJS.ProcessEnv=process.env){return studioEnabled(env)&&env.NOTES_STUDIO_DELIVERY_ENABLED==='1';}
export function requirePublicDelivery(){if(!publicDeliveryEnabled())throw new Error('Public Notes delivery is independently disabled.');}
export function validateDraft(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid Note.');
 const v=value as Record<string,unknown>;
 const title=typeof v.title==='string'?v.title.trim():'';
 const slug=typeof v.slug==='string'?v.slug.trim():'';
 const body=typeof v.body==='string'?v.body:'';
 const imageAlt=typeof v.imageAlt==='string'?v.imageAlt.trim():'';
 const narrator=v.narrator==='Steven'?'Steven':'Behzad';
 const excerpt=typeof v.excerpt==='string'?v.excerpt:'';
 const imageCaption=typeof v.imageCaption==='string'?v.imageCaption:'';
 const seoDescription=typeof v.seoDescription==='string'?v.seoDescription:'';
 const framing=v.framing==null?null:validateFraming(v.framing);
 if(!title||title.length>160||!slug||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)||!body.trim()||body.length>15000||imageAlt.length>250||excerpt.length>1000||imageCaption.length>1000||seoDescription.length>500)throw new Error('A valid title, slug and authentic Note text are required.');
 return {title,slug,body,imageAlt,narrator,excerpt,imageCaption,seoDescription,framing};
}
export async function listStudioNotes(){
 requireStudio();
 return query<StudioNote>(`SELECT * FROM studio_notes ORDER BY created_at DESC LIMIT 60`);
}
export async function getStudioNote(id:string){
 requireStudio();
 if(!/^[a-f0-9-]{36}$/i.test(id))return null;
 return (await query<StudioNote>('SELECT * FROM studio_notes WHERE id=$1',[id]))[0]??null;
}
// Snapshots are private, immutable and never alter the public Note archive.
export type StudioRevision={
 note_id:string;revision:number;slug:string;title:string;body:string;
 narrator:'Behzad'|'Steven';image_alt:string;excerpt:string;image_caption:string;
 seo_description:string;saved_at:string;photo_id:string|null;photo_framing:Framing|null;
};
export async function listStudioRevisions(noteId:unknown){
 requireStudio();
 if(typeof noteId!=='string'||!/^[a-f0-9-]{36}$/i.test(noteId))throw Error('Invalid Note.');
 const note=await getStudioNote(noteId);
 if(!note)throw Error('Note not found.');
 return query<StudioRevision>(
  `SELECT note_id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,saved_at,photo_id,photo_framing
   FROM studio_note_revisions WHERE note_id=$1 ORDER BY revision DESC LIMIT 100`,[noteId]);
}
export async function getStudioRevision(noteId:unknown,revision:unknown){
 requireStudio();
 if(typeof noteId!=='string'||!/^[a-f0-9-]{36}$/i.test(noteId)||!Number.isSafeInteger(revision)||Number(revision)<1)throw Error('Invalid Note revision.');
 const note=await getStudioNote(noteId);
 if(!note)throw Error('Note not found.');
 return (await query<StudioRevision>(
  `SELECT note_id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,saved_at
   FROM studio_note_revisions WHERE note_id=$1 AND revision=$2`,[noteId,revision]))[0]??null;
}
export async function saveStudioDraft(input:unknown,id?:unknown,revision?:unknown){
 requireStudio();const draft=validateDraft(input);
 if(typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id)){
  if(!Number.isInteger(revision))throw new Error('Revision is required.');
  const rows=await query<StudioNote>(`WITH changed AS (
   UPDATE studio_notes SET slug=$2,title=$3,body=$4,image_alt=$5,narrator=$7,excerpt=$8,image_caption=$9,seo_description=$10,photo_framing=$11::jsonb,revision=revision+1,updated_at=NOW()
   WHERE id=$1 AND state='draft' AND revision=$6 RETURNING *
  ), recorded AS (
   INSERT INTO studio_note_revisions(note_id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,saved_at,photo_id,photo_framing)
   SELECT id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,updated_at,photo_id,photo_framing FROM changed
   RETURNING note_id,revision
  ) SELECT changed.* FROM changed JOIN recorded ON recorded.note_id=changed.id AND recorded.revision=changed.revision
  `,[id,draft.slug,draft.title,draft.body,draft.imageAlt,revision,draft.narrator,draft.excerpt,draft.imageCaption,draft.seoDescription,draft.framing?JSON.stringify(draft.framing):null]);
  if(!rows.length)throw new Error('The draft changed or is no longer editable. Reload.');
  return rows[0];
 }
 const rows=await query<StudioNote>(`WITH created AS (
   INSERT INTO studio_notes(id,slug,title,body,image_alt,narrator,excerpt,image_caption,seo_description,photo_framing)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING *
  ), recorded AS (
   INSERT INTO studio_note_revisions(note_id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,saved_at,photo_id,photo_framing)
   SELECT id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,updated_at,photo_id,photo_framing FROM created
   RETURNING note_id,revision
  ) SELECT created.* FROM created JOIN recorded ON recorded.note_id=created.id AND recorded.revision=created.revision
  `,[randomUUID(),draft.slug,draft.title,draft.body,draft.imageAlt,draft.narrator,draft.excerpt,draft.imageCaption,draft.seoDescription]);
 return rows[0];
}
export async function scheduleStudioNote(id:unknown,iso:unknown,revision:unknown){
 requireStudio();
 if(typeof id!=='string'||typeof iso!=='string'||!Number.isInteger(revision))throw new Error('Invalid schedule.');
 const when=new Date(iso);
 if(Number.isNaN(when.getTime())||when.getTime()<Date.now()+60000||when.getTime()>Date.now()+365*86400000)throw new Error('Choose a time between one minute and one year from now.');
 const rows=await query<StudioNote>(`UPDATE studio_notes SET state='scheduled',scheduled_at=$2,revision=revision+1,updated_at=NOW()
 WHERE id=$1 AND state='draft' AND revision=$3 RETURNING *`,[id,when.toISOString(),revision]);
 if(!rows.length)throw new Error('Draft changed or is not available for scheduling.');
 return rows[0];
}
export async function cancelScheduledNote(id:unknown){
 requireStudio();if(typeof id!=='string')throw new Error('Invalid Note.');
 const rows=await query<StudioNote>(`UPDATE studio_notes SET state='cancelled',updated_at=NOW() WHERE id=$1 AND state='scheduled' RETURNING *`,[id]);
 if(!rows.length)throw new Error('Only scheduled Notes can be cancelled.');
 return rows[0];
}
export async function setStudioPaused(id:unknown,paused:unknown){
 requireStudio();if(typeof id!=='string'||typeof paused!=='boolean')throw new Error('Invalid pause request.');
 const rows=await query<StudioNote>(`UPDATE studio_notes SET paused=$2,updated_at=NOW() WHERE id=$1 AND state='published' RETURNING *`,[id,paused]);
 if(!rows.length)throw new Error('Only published Notes can be paused.');
 return rows[0];
}
export function previewStudioNote(note:{title:string;body:string;image_alt:string}){
 return renderStudioEmail({title:note.title,rawText:note.body,imageAlt:note.image_alt});
}

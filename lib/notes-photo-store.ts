import 'server-only';
import {randomUUID} from 'node:crypto';
import {query} from './database';
import {requireStudio, type StudioNote} from './notes-studio';
import {validateNotePhoto} from './notes-photo-validation';

// Private BYTEA mode from the first Local Studio prototype.
// Public serving and campaign attachments are intentionally NOT wired up.
export async function saveStudioPhotograph(noteId:unknown,revision:unknown,bytes:Buffer,mime:string,alt:unknown){
 requireStudio();
 if(typeof noteId!=='string'||!/^[a-f0-9-]{36}$/i.test(noteId)||!Number.isSafeInteger(revision)||Number(revision)<1)
  throw Error('Save the Note before uploading its photograph.');
 if(typeof alt!=='string'||!alt.trim()||alt.trim().length>250)throw Error('Add a short photograph description before uploading.');
 const photo=validateNotePhoto(bytes,mime);
 const assetId=randomUUID();
 const rows=await query<StudioNote>(`WITH locked AS (
    SELECT id FROM studio_notes WHERE id=$1::uuid AND state='draft' AND revision=$2::integer FOR UPDATE
   ), image AS (
    INSERT INTO studio_note_images(id,note_id,mime_type,bytes,sha256,width,height)
    SELECT $3::uuid,id,$4,decode($5,'hex'),$6,$7,$8 FROM locked RETURNING id,note_id
   ), changed AS (
    UPDATE studio_notes SET photo_id=(SELECT id FROM image),image_alt=$9,revision=revision+1,updated_at=NOW()
    WHERE id=$1::uuid AND id IN (SELECT note_id FROM image) RETURNING *
   ), recorded AS (
    INSERT INTO studio_note_revisions(note_id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,saved_at,photo_id,photo_framing)
    SELECT id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,updated_at,photo_id,photo_framing FROM changed
    RETURNING note_id,revision
   ) SELECT changed.* FROM changed JOIN recorded ON recorded.note_id=changed.id AND recorded.revision=changed.revision`,
  [noteId,revision,assetId,photo.mimeType,photo.bytes.toString('hex'),photo.sha256,photo.width,photo.height,alt.trim()]);
 if(!rows.length)throw Error('The draft changed before upload. Reload your Note and try again.');
 return rows[0];
}
export async function readStudioPhotograph(noteId:unknown,assetId:unknown){
 requireStudio();
 if(typeof noteId!=='string'||typeof assetId!=='string'||!/^[a-f0-9-]{36}$/i.test(noteId)||!/^[a-f0-9-]{36}$/i.test(assetId))return null;
 const rows=await query<{mime_type:string;hex:string}>(`SELECT mime_type,encode(bytes,'hex') AS hex
  FROM studio_note_images WHERE note_id=$1::uuid AND id=$2::uuid LIMIT 1`,[noteId,assetId]);
 if(!rows[0])return null;
 return {mimeType:rows[0].mime_type,bytes:Buffer.from(rows[0].hex,'hex')};
}

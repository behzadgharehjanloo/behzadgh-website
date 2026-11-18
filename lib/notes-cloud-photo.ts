import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {query} from './database';
import {getStudioNote,requireStudio,type StudioNote} from './notes-studio';
import {requireCloud,readPrivateOriginal,putImmutableOriginal,signPrivatePhoto} from './notes-cloud-s3';
import {validateNotePhoto} from './notes-photo-validation';

type Upload={id:string;note_id:string;expected_revision:number;quarantine_key:string;file_size:number;mime_type:'image/jpeg'|'image/png';sha256:string;state:'uploading'|'attached'|'failed';photo_id:string|null};
function uuid(v:unknown):v is string{return typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);}
export async function beginOriginalPhotoUpload(noteId:unknown,revision:unknown,size:unknown,mime:unknown,hash:unknown){
 requireStudio();requireCloud();
 if(!uuid(noteId)||!Number.isSafeInteger(revision)||Number(revision)<1||!Number.isSafeInteger(size)||Number(size)<1||Number(size)>10_000_000||
    !['image/jpeg','image/png'].includes(String(mime))||typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash))throw Error('Select a valid JPEG or PNG up to 10 MB.');
 const id=randomUUID(),key=`quarantine/${id}/upload`;
 const rows=await query<{id:string}>(`
 INSERT INTO studio_cloud_photo_uploads(id,note_id,expected_revision,quarantine_key,file_size,mime_type,sha256)
 SELECT $1::uuid,n.id,$3::integer,$4,$5::integer,$6,$7
 FROM studio_notes n
 WHERE n.id=$2::uuid AND n.state='draft' AND n.revision=$3::integer
 AND (SELECT count(*) FROM studio_cloud_photo_uploads WHERE state='uploading' AND expires_at>NOW()) < 8
 RETURNING id`,[id,noteId,revision,key,size,mime,hash]);
 if(!rows.length)throw Error('Draft changed or too many photographs are being uploaded. Reload and retry.');
 return {uploadId:id,url:signPrivatePhoto(key,'PUT',String(mime),120),mimeType:mime,expiresInSeconds:120};
}
export async function finalizeOriginalPhotoUpload(uploadId:unknown,noteId:unknown,alt:unknown){
 requireStudio();requireCloud();
 if(!uuid(uploadId)||!uuid(noteId)||typeof alt!=='string'||alt.trim().length>250)throw Error('Invalid photograph upload.');
 const record=(await query<Upload>(`SELECT * FROM studio_cloud_photo_uploads WHERE id=$1::uuid AND note_id=$2::uuid AND expires_at>NOW()`,[uploadId,noteId]))[0];
 if(!record)throw Error('Photo upload expired. Choose the file again.');
 if(record.state==='attached'&&record.photo_id){
  const note=await getStudioNote(noteId);
  if(note)return note;
 }
 if(record.state!=='uploading')throw Error('The photograph is no longer available.');
 const bytes=await readPrivateOriginal(record.quarantine_key,10_000_000);
 if(bytes.length!==record.file_size)throw Error('Uploaded photograph size changed. Choose it again.');
 const hash=createHash('sha256').update(bytes).digest('hex');
 if(hash!==record.sha256)throw Error('The photograph checksum did not match. Choose it again.');
 const image=validateNotePhoto(bytes,record.mime_type,10_000_000);
 // Never authorize browser writes to final keys; the original is copied from
 // verified bytes to a separate immutable key. Failed DB writes leave private
 // orphan objects for explicitly reviewed cleanup, never modify existing Notes.
 const assetId=randomUUID(),permanentKey=`originals/${assetId}/original`;
 await putImmutableOriginal(permanentKey,bytes,image.mimeType);
 const rows=await query<StudioNote>(`WITH locked AS (
  SELECT n.id FROM studio_notes n
  JOIN studio_cloud_photo_uploads u ON u.note_id=n.id AND u.id=$1::uuid
  WHERE n.id=$2::uuid AND n.state='draft' AND n.revision=u.expected_revision
   AND u.state='uploading' AND u.expires_at>NOW()
  FOR UPDATE OF n,u
 ), asset AS (
  INSERT INTO studio_note_images(id,note_id,mime_type,bytes,storage_key,original_size,sha256,width,height)
  SELECT $3::uuid,id,$4,NULL,$5,$6::integer,$7,$8::integer,$9::integer FROM locked
  RETURNING id,note_id
 ), changed AS (
  UPDATE studio_notes SET photo_id=(SELECT id FROM asset),image_alt=$10,
   revision=revision+1,updated_at=NOW()
  WHERE id=$2::uuid AND id IN (SELECT note_id FROM asset) RETURNING *
 ), snapshot AS (
  INSERT INTO studio_note_revisions(note_id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,saved_at,photo_id,photo_framing)
  SELECT id,revision,slug,title,body,narrator,image_alt,excerpt,image_caption,seo_description,updated_at,photo_id,photo_framing FROM changed
  RETURNING note_id,revision
 ), done AS (
  UPDATE studio_cloud_photo_uploads SET state='attached',photo_id=(SELECT id FROM asset)
  WHERE id=$1::uuid AND EXISTS(SELECT 1 FROM snapshot)
  RETURNING id
 ) SELECT changed.* FROM changed JOIN snapshot ON snapshot.note_id=changed.id AND snapshot.revision=changed.revision
 JOIN done ON true`,
 [uploadId,noteId,assetId,image.mimeType,permanentKey,bytes.length,hash,image.width,image.height,alt.trim()]);
 if(!rows.length)throw Error('Draft changed while uploading. Original is safe in private storage, but was not attached; reload.');
 return rows[0];
}

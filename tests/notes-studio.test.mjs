import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadProject} from './helpers/load-project.mjs';

const studio=loadProject('lib/notes-studio.ts',{
 './database':{query:async()=>{throw Error('Database must not be accessed in pure tests');}},
 './notes-email':{renderStudioEmail:()=>({subject:'test',text:'test',html:'<p>test</p>'})}
});
test('Studio cannot run from Preview, development, or with missing Production opt-in',()=>{
 for(const env of [{},{NOTES_STUDIO_ENABLED:'1',VERCEL_ENV:'preview',NODE_ENV:'production'},{NOTES_STUDIO_ENABLED:'0',VERCEL_ENV:'production',NODE_ENV:'production'},{NOTES_STUDIO_ENABLED:'1',VERCEL_ENV:'production',NODE_ENV:'development'}]){
  assert.equal(studio.studioEnabled(env),false);
 }
 assert.equal(studio.studioEnabled({NOTES_STUDIO_ENABLED:'1',VERCEL_ENV:'production',NODE_ENV:'production'}),true);
});
test('Note validator requires authentic nonempty content and rejects bad slugs',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(studio.validateDraft({slug:'my-note',title:' The Window ',body:'A real paragraph.\n\nAnother.',imageAlt:''}))),
 {slug:'my-note',title:'The Window',body:'A real paragraph.\n\nAnother.',imageAlt:'',narrator:'Behzad',excerpt:'',imageCaption:'',seoDescription:'',framing:null});
 for(const draft of [
  {slug:'My-Note',title:'Okay',body:'Original'},
  {slug:'valid',title:'',body:'Original'},
  {slug:'valid',title:'Okay',body:'   '},
  {slug:'valid',title:'Okay',body:'a'.repeat(15001)}
 ])assert.throws(()=>studio.validateDraft(draft));
});
test('New campaign tables are isolated from existing subscriber and welcome flows',()=>{
 const migration=fs.readFileSync('db/notes-studio-migrations/0001_notes_studio.sql','utf8');
 assert.match(migration,/UNIQUE\(note_id,subscriber_id\)/);
 assert.match(migration,/studio_test_sends/);
 assert.doesNotMatch(migration,/ALTER TABLE subscribers|DELETE FROM subscribers|DROP TABLE|UPDATE subscribers/);
 const worker=fs.readFileSync('lib/notes-studio-worker.ts','utf8');
 assert.match(worker,/SKIP LOCKED/);
 assert.match(worker,/needs_review/);
 assert.match(worker,/subscriber_status!=='active'/);
 const cron=fs.readFileSync('app/api/cron/notes-studio/route.ts','utf8');
 assert.match(cron,/CRON_SECRET/);
 assert.match(cron,/!studioEnabled\(\)/);
});

test('original local Editor, Website preview and Email preview are restored as live tabs',()=>{
 const component=fs.readFileSync('components/admin/NotesStudioEditor.tsx','utf8');
 for(const tab of ['Editor','Website preview','Email preview'])assert.ok(component.includes(tab));
 assert.match(component,/StudioReadingPreview draft=\{draft\}/);
 assert.match(component,/StudioEmailPreview draft=\{draft\}/);
 assert.match(component,/Narrator/);
 assert.match(component,/Advanced \/ SEO/);
 assert.match(component,/disabled=\{editorTab!=='edit'\}|hidden=\{editorTab!=='edit'\}/);
 const migration=fs.readFileSync('db/notes-studio-migrations/0002_original_editor_fields.sql','utf8');
 assert.match(migration,/ADD COLUMN narrator/);
 assert.doesNotMatch(migration,/DELETE FROM|DROP TABLE|UPDATE subscribers/);
});

test('original local editor protects unsaved text and keyboard preview tabs',()=>{
 const editor=fs.readFileSync('components/admin/NotesStudioEditor.tsx','utf8');
 assert.match(editor,/beforeunload/);
 assert.match(editor,/Unsaved changes will be lost/);
 assert.match(editor,/ArrowRight/);
 assert.match(editor,/ArrowLeft/);
 assert.match(editor,/event.key==='Home'/);
 assert.match(editor,/event.key==='End'/);
 assert.match(editor,/tabIndex=\{editorTab===key\?0:-1\}/);
});

test('private website preview uses actual Local Window Journey structure without changing raw text',()=>{
 const preview=fs.readFileSync('components/admin/notes/StudioReadingPreview.tsx','utf8');
 const css=fs.readFileSync('components/admin/notes/original-window-journey.css','utf8');
 assert.match(preview,/wj-reading-layout/);
 assert.match(preview,/wj-reading-text/);
 assert.match(preview,/wj-reading-photo/);
 assert.match(preview,/Private draft/);
 assert.doesNotMatch(preview,/Narrated by/);
 assert.match(preview,/draft.body/);
 assert.match(preview,/whiteSpace:'pre-wrap'/);
 assert.doesNotMatch(preview,/fetch\(|action\(|POST|sendMail/);
 assert.match(css,/grid-template-columns:minmax\(0,1.45fr\)/);
 assert.match(css,/studio-window-journey/);
});

test('reader preview does not expose narrator on website or mobile',()=>{
 const preview=fs.readFileSync('components/admin/notes/StudioReadingPreview.tsx','utf8');
 const editor=fs.readFileSync('components/admin/NotesStudioEditor.tsx','utf8');
 assert.doesNotMatch(preview,/Narrated by|\{draft\.narrator\}/);
 assert.match(editor,/Narrator<select/);
 assert.match(editor,/StudioReadingPreview draft=\{draft\}/);
});
test('private draft save displays original Local New York date with no invented timestamp',()=>{
 const time=loadProject('lib/notes-studio-save-time.ts');
 assert.equal(time.savedTime('2026-11-18T17:00:00.000Z'),'Saved November 18, 2026 at 12:00 PM EST');
 assert.equal(time.savedTime('2026-07-20T16:30:00.000Z'),'Saved July 20, 2026 at 12:30 PM EDT');
 assert.equal(time.savedTime(undefined),null);
 assert.equal(time.savedTime('garbled'),null);
 const editor=fs.readFileSync('components/admin/NotesStudioEditor.tsx','utf8');
 assert.match(editor,/savedTime\(selected\?\.updated_at\)/);
 assert.match(editor,/dateTime=\{selected\?\.updated_at\}/);
});

test('saved date appears immediately beside the private Save button',()=>{
 const editor=fs.readFileSync('components/admin/NotesStudioEditor.tsx','utf8');
 const save=editor.lastIndexOf("Save private draft");
 const date=editor.indexOf("savedTime(selected?.updated_at)",save);
 assert.ok(save>=0&&date>save&&date-save<2600);
 assert.match(editor,/items-center gap-x-5 gap-y-3 border-t/);
 assert.match(editor,/min-w-0 flex-1 text-xs/);
 assert.doesNotMatch(editor,/w-full text-xs leading-6 text-\[#766c60\]/);
});

test('history is append-only and saved atomically with each private Note revision',()=>{
 const backend=fs.readFileSync('lib/notes-studio.ts','utf8');
 const migration=fs.readFileSync('db/notes-studio-migrations/0004_private_revision_history.sql','utf8');
 const route=fs.readFileSync('app/api/admin/notes-studio/route.ts','utf8');
 const editor=fs.readFileSync('components/admin/NotesStudioEditor.tsx','utf8');
 assert.match(backend,/WITH changed AS \(/);
 assert.match(backend,/WITH created AS \(/);
 assert.match(backend,/INSERT INTO studio_note_revisions/);
 assert.match(backend,/JOIN recorded ON recorded.note_id/);
 assert.match(migration,/PRIMARY KEY\(note_id,revision\)/);
 assert.match(migration,/BEFORE UPDATE OR DELETE ON studio_note_revisions/);
 assert.match(migration,/ON CONFLICT \(note_id,revision\) DO NOTHING/);
 assert.match(route,/body.action==='history'/);
 assert.match(editor,/Revision history/);
 assert.match(editor,/Read-only historical revision/);
 assert.match(editor,/View saved revisions/);
 assert.doesNotMatch(migration,/\b(DROP TABLE|DELETE FROM|UPDATE subscribers|ALTER TABLE subscribers)\b/i);
});

test('private photographs remain authenticated and separate from public delivery',()=>{
 const migration=fs.readFileSync('db/notes-studio-migrations/0005_private_photo_assets.sql','utf8');
 const route=fs.readFileSync('app/api/admin/notes-studio/photo/route.ts','utf8');
 const backend=fs.readFileSync('lib/notes-photo-store.ts','utf8');
 const editor=fs.readFileSync('components/admin/NotesStudioEditor.tsx','utf8');
 assert.match(migration,/CREATE TABLE studio_note_images/);
 assert.match(migration,/ON DELETE RESTRICT/);
 assert.match(migration,/DEFERRABLE INITIALLY DEFERRED/);
 assert.doesNotMatch(migration,/ALTER TABLE subscribers|UPDATE subscribers|DELETE FROM subscribers|DROP TABLE/i);
 assert.match(route,/isAdminAuthenticatedReadOnly/);
 assert.match(route,/isSameOriginPost/);
 assert.match(route,/Cache-Control.*private, no-store/);
 assert.match(backend,/WITH locked AS/);
 assert.match(backend,/INSERT INTO studio_note_revisions/);
 assert.match(editor,/PrivatePhotographFraming/);
 assert.match(editor,/Click Save private draft to store this image/);
});

test('original Local photo picker is enabled before first save without requiring alt text',()=>{
 const editor=fs.readFileSync('components/admin/NotesStudioEditor.tsx','utf8');
 const photo=fs.readFileSync('components/admin/notes/PrivatePhotographFraming.tsx','utf8');
 const backend=fs.readFileSync('lib/notes-photo-store.ts','utf8');
 assert.match(editor,/const \[pendingPhoto,setPendingPhoto\]/);
 assert.match(editor,/disabled=\{!editable\|\|busy\}/);
 assert.doesNotMatch(editor,/!draft.imageAlt.trim\(\)/);
 assert.match(editor,/setPendingPhoto\(file\)/);
 assert.match(editor,/const result=await action\(\{action:'save',id:selection,revision,draft\}\)/);
 assert.match(editor,/form.set\('photograph',pendingPhoto\)/);
 assert.match(editor,/incorporate\(upload.note\)/);
 assert.match(editor,/Selected photograph:/);
 assert.match(backend,/if\(typeof alt!=='string'\|\|alt.trim\(\).length>250\)/);
 assert.match(photo,/onPointerDown/);
 assert.match(photo,/onPointerMove/);
 assert.match(photo,/setPointerCapture/);
 assert.match(photo,/ArrowLeft/);
 assert.match(photo,/ArrowRight/);
 assert.match(photo,/ArrowUp/);
 assert.match(photo,/ArrowDown/);
 assert.match(photo,/Math.min\(3,frame.zoom\+\.1\)/);
 assert.match(photo,/Math.max\(1,frame.zoom-\.1\)/);
 assert.match(photo,/value=\{frame\[key\]\}/);
 assert.match(photo,/framing-context|Presentation/);
});

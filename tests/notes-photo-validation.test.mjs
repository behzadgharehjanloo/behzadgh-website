import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProject} from './helpers/load-project.mjs';

const photos=loadProject('lib/notes-photo-validation.ts');
const validPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Ry4tRAAAAAASUVORK5CYII=','base64');
test('private original PNG is bounded and checked against real signature, dimensions and MIME',()=>{
 const value=photos.validateNotePhoto(validPng,'image/png');
 assert.equal(value.width,1);
 assert.equal(value.height,1);
 assert.match(value.sha256,/^[a-f0-9]{64}$/);
 assert.throws(()=>photos.validateNotePhoto(validPng,'image/jpeg'));
 assert.throws(()=>photos.validateNotePhoto(Buffer.from('<script>alert(1)</script>'),'image/png'));
 assert.throws(()=>photos.validateNotePhoto(Buffer.alloc(3*1024*1024+1),'image/png'));
});
test('reject mismatched JPEG MIME and fake JPEG without a scan',()=>{
 assert.throws(()=>photos.validateNotePhoto(Buffer.from([255,216,255,217]),'image/jpeg'));
});

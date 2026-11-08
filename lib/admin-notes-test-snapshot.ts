import 'server-only';
import {createHash} from 'node:crypto';
import {renderStudioEmail} from './notes-email';
import {buildRawMessage} from './gmail-service.mjs';

// The already approved synthetic fixture. No memoir, subscriber or Studio lookup.
export const adminTestNote=Object.freeze({title:'Synthetic publication test',rawText:'  Synthetic publication test.\r\n\r\nSecond paragraph\u2014punctuation preserved.  \n\n\tFinal test line.\n',imageAlt:'Synthetic blue test image'});
const photograph="iVBORw0KGgoAAAANSUhEUgAAAHgAAACgCAIAAABIaz/HAAABMElEQVR4nO3QAQkAIADAMDPZxRD2L2ALhTt4gLMx19aFxvODTwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVgek3lQbgAtCdgAAAABJRU5ErkJggg==";
const hash=(bytes:string|Buffer)=>createHash('sha256').update(bytes).digest('hex');
export function adminTestImage(){return Buffer.from(photograph,'base64');}
export function adminTestSnapshot(){
 const content=renderStudioEmail(adminTestNote,undefined,{imageCid:'synthetic-snapshot@behzadgh.com'});
 const subject=`[TEST] ${adminTestNote.title}`,imageSha256=hash(adminTestImage());
 return {subject,imageSha256,snapshotId:hash(JSON.stringify({version:1,sender:'Behzad Gharehjanloo <still@behzadgh.com>',subject,imageSha256,html:content.html,text:content.text})),preview:renderStudioEmail(adminTestNote,`data:image/png;base64,${photograph}`).html};
}
export async function buildAdminTestMime(recipient:string,attemptId:string){
 const content=renderStudioEmail(adminTestNote,undefined,{imageCid:`admin-test-${attemptId}@behzadgh.com`});
 return buildRawMessage({to:recipient,subject:adminTestSnapshot().subject,text:content.text,html:content.html,messageKey:`controlled_admin_test:${attemptId}`,attachments:[{filename:'synthetic-note.png',content:adminTestImage(),contentType:'image/png',cid:`admin-test-${attemptId}@behzadgh.com`}]});
}

import {createHash} from 'node:crypto';

// Preserve the original Local editor's private 3 MiB JPEG/PNG policy.
// Never trust the browser's MIME or filename alone.
export const MAX_NOTE_PHOTO_BYTES=3*1024*1024;
export type ValidatedPhoto={bytes:Buffer;mimeType:'image/jpeg'|'image/png';width:number;height:number;sha256:string};
function invalid():never{throw Error('Use a valid JPEG or non-interlaced PNG photograph under 3 MB and 16 megapixels (8192px per side).');}
function validSize(width:number,height:number){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||width*height>16_000_000)invalid();}
export function validateNotePhoto(bytes:Buffer,mime:string):ValidatedPhoto{
 if(!bytes.length||bytes.length>MAX_NOTE_PHOTO_BYTES)invalid();
 let width=0,height=0;
 let detected:'image/jpeg'|'image/png';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
  detected='image/png';
  if(bytes.length<45||bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(8)!==13)invalid();
  width=bytes.readUInt32BE(16);height=bytes.readUInt32BE(20);validSize(width,height);
  if(bytes[28]!==0||bytes[26]!==0||bytes[27]!==0||bytes[29]!==0)invalid(); // compression, filter, interlace, invalid flags
  if(![0,2,3,4,6].includes(bytes[25]))invalid();
  if(!bytes.subarray(bytes.length-12,bytes.length-8).equals(Buffer.from([0,0,0,0]))||bytes.toString('ascii',bytes.length-8,bytes.length-4)!=='IEND')invalid();
 }else if(bytes[0]===255&&bytes[1]===216){
  detected='image/jpeg';
  if(bytes.length<16||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)invalid();
  let offset=2,scan=false;
  while(offset<bytes.length-2){
   if(bytes[offset++]!==255)invalid();
   while(bytes[offset]===255)offset++;
   const mark=bytes[offset++];
   if(mark===0||mark===undefined||mark===216||mark===217)invalid();
   if(offset+2>bytes.length)invalid();
   const length=bytes.readUInt16BE(offset);
   if(length<2||offset+length>bytes.length)invalid();
   if([192,193,194].includes(mark)){
    if(width||length<8)invalid();
    height=bytes.readUInt16BE(offset+3);width=bytes.readUInt16BE(offset+5);validSize(width,height);
   }else if(mark>=192&&mark<=207&&![196,200,204].includes(mark))invalid();
   offset+=length;
   if(mark===218){scan=true;break;}
  }
  if(!width||!scan)invalid();
 }else invalid();
 if(mime!==detected)invalid();
 return{bytes,mimeType:detected,width,height,sha256:createHash('sha256').update(bytes).digest('hex')};
}

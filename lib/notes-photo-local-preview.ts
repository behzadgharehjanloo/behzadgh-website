// Recovered from the approved Local Studio cloud-photo-preview.ts.
// Browser-only JPEG/PNG validation and decoded preview. Do not upload until Save.
export const MAX_LOCAL_PHOTO_BYTES=10_000_000;
const REQUIREMENTS='Use a valid JPEG or non-interlaced PNG up to 10 MB, 16 megapixels and 8192px per side.';
export async function readLocalPhotographPreview(file:File,signal:AbortSignal):Promise<string>{
 if(!file.size||file.size>MAX_LOCAL_PHOTO_BYTES||!['image/png','image/jpeg'].includes(file.type))throw Error(REQUIREMENTS);
 const bytes=new Uint8Array(await file.slice(0,1_048_576).arrayBuffer());
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 const view=new DataView(bytes.buffer);
 let width=0,height=0;
 if(file.type==='image/png'){
  if(bytes.length<33||![137,80,78,71,13,10,26,10].every((b,i)=>b===bytes[i])||bytes[28]!==0)throw Error(REQUIREMENTS);
  width=view.getUint32(16);height=view.getUint32(20);
 }else{
  if(bytes[0]!==255||bytes[1]!==216)throw Error(REQUIREMENTS);
  let i=2;
  while(i+8<bytes.length){
   if(bytes[i++]!==255)break;while(bytes[i]===255)i++;
   const marker=bytes[i++];
   if(marker===0xda||marker===0xd9)break;
   const size=view.getUint16(i);
   if(size<2||i+size>bytes.length)break;
   if([0xc0,0xc1,0xc2].includes(marker)){height=view.getUint16(i+3);width=view.getUint16(i+5);break;}
   i+=size;
  }
 }
 if(!width||!height||width>8192||height>8192||width*height>16_000_000)throw Error(REQUIREMENTS);
 const url=URL.createObjectURL(file);
 try{
  await new Promise<void>((resolve,reject)=>{
   const picture=new Image();
   const cleanup=()=>{signal.removeEventListener('abort',cancel);picture.onload=null;picture.onerror=null;};
   const cancel=()=>{cleanup();picture.src='';reject(new DOMException('Cancelled','AbortError'));};
   signal.addEventListener('abort',cancel,{once:true});
   picture.onload=()=>{cleanup();resolve();};
   picture.onerror=()=>{cleanup();reject(Error(REQUIREMENTS));};
   picture.src=url;
   if(signal.aborted)cancel();
  });
  return url;
 }catch(error){URL.revokeObjectURL(url);throw error;}
}
export async function localEmailPhotographPreview(url:string):Promise<string>{
 const picture=new Image();picture.src=url;await picture.decode();
 const scale=Math.min(1,720/picture.naturalWidth,1080/picture.naturalHeight);
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));
 canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
 const context=canvas.getContext('2d');if(!context)throw Error('Email photograph preview unavailable.');
 context.fillStyle='#f5f0e6';context.fillRect(0,0,canvas.width,canvas.height);
 context.drawImage(picture,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/jpeg',0.8);
}

/** Optimize an oversized local photograph only for the current 3 MiB private
 * online storage. The user's original file is never modified. The approved
 * 10 MB original-retention cloud pipeline is still a separate migration. */
export async function prepareLocalPhotoUpload(file:File):Promise<{file:File;optimized:boolean}>{
 const limit=3*1024*1024;
 if(file.size<=limit)return{file,optimized:false};
 if(file.size>MAX_LOCAL_PHOTO_BYTES)throw Error(REQUIREMENTS);
 const url=URL.createObjectURL(file);
 try{
  const picture=new Image();picture.src=url;await picture.decode();
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,3200/picture.naturalWidth,3200/picture.naturalHeight);
  canvas.width=Math.max(1,Math.round(picture.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(picture.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Photograph processing unavailable in this browser.');
  ctx.fillStyle='#f5f0e6';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(picture,0,0,canvas.width,canvas.height);
  const encode=(quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Photograph conversion failed.')),'image/jpeg',quality));
  for(let step=0;step<7;step++){
   for(const quality of [0.85,0.72,0.58]){
    const blob=await encode(quality);
    if(blob.size&&blob.size<=limit){
     return{file:new File([blob],file.name.replace(/\.(jpg|jpeg|png)$/i,'')+'-web.jpg',{type:'image/jpeg'}),optimized:true};
    }
   }
   canvas.width=Math.max(1,Math.floor(canvas.width*.8));
   canvas.height=Math.max(1,Math.floor(canvas.height*.8));
   ctx.fillStyle='#f5f0e6';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(picture,0,0,canvas.width,canvas.height);
  }
  throw Error('Unable to prepare a photograph small enough for online storage.');
 }finally{URL.revokeObjectURL(url);}
}

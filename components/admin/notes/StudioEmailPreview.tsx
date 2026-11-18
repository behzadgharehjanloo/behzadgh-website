'use client';
import {useEffect,useId,useState} from 'react';
import {cropRectangle,frameFor,originalFraming,type Framing} from '@/lib/notes-framing';
import {renderStudioEmail} from '@/lib/notes-email';
type Draft={title:string;body:string;imageAlt:string;framing:Framing|null};
export function StudioEmailPreview({draft,image}:{draft:Draft;image?:string}){
 const [personalized,setPersonalized]=useState(false);
 const [mobile,setMobile]=useState(false);
 const id=useId();
 const [framedImage,setFramedImage]=useState<string|undefined>(undefined);
 const cropRule=frameFor(draft.framing??originalFraming,'email');
 const cropKey=JSON.stringify(cropRule);
 useEffect(()=>{
  setFramedImage(undefined);
  if(!image)return;
  let disposed=false;const picture=new Image();
  picture.onload=()=>{
   if(disposed)return;
   const crop=cropRectangle(picture.naturalWidth,picture.naturalHeight,cropRule);
   const canvas=document.createElement('canvas');const ratio=Math.min(1,1200/crop.width);
   canvas.width=Math.max(1,Math.round(crop.width*ratio));canvas.height=Math.max(1,Math.round(crop.height*ratio));
   const context=canvas.getContext('2d');if(!context)return;
   context.drawImage(picture,crop.left,crop.top,crop.width,crop.height,0,0,canvas.width,canvas.height);
   if(!disposed)setFramedImage(canvas.toDataURL('image/jpeg',0.85));
  };
  picture.src=image;
  return()=>{disposed=true;picture.src='';};
 },[image,cropKey]);
 const email=renderStudioEmail({title:draft.title,rawText:draft.body,imageAlt:draft.imageAlt},framedImage,{preferredName:personalized?'Alex':undefined});
 return <div className="studio-original-email-preview">
  <p className="text-xs leading-6 text-[#606364]">Subject: {email.subject||'No title entered'}. This serialized Note is separate from the introductory welcome letter.</p>
  <div className="mt-4 flex flex-wrap gap-5 md:gap-10">
   <fieldset className="min-w-0"><legend className="mb-2 text-xs font-semibold">Greeting preview</legend>
    <label className="mr-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-[#d5c7ae] px-3 text-xs"><input type="radio" name={id+'-greeting'} checked={!personalized} onChange={()=>setPersonalized(false)}/>Generic: Hi there,</label>
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-[#d5c7ae] px-3 text-xs"><input type="radio" name={id+'-greeting'} checked={personalized} onChange={()=>setPersonalized(true)}/>Example: Hi Alex,</label>
   </fieldset>
   <fieldset className="min-w-0"><legend className="mb-2 text-xs font-semibold">Preview width</legend>
    <label className="mr-2 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-[#d5c7ae] px-3 text-xs"><input type="radio" name={id+'-width'} checked={!mobile} onChange={()=>setMobile(false)}/>Desktop</label>
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-[#d5c7ae] px-3 text-xs"><input type="radio" name={id+'-width'} checked={mobile} onChange={()=>setMobile(true)}/>Mobile</label>
   </fieldset>
  </div>
  <p className="my-4 text-xs leading-5 text-[#606364]">Browser preview only. No subscriber data or send action. Your Note text stays exactly as entered.</p>
  <iframe title={personalized?'Synthetic personalized Note email preview':'Generic Note email preview'} className={'block h-[730px] w-full border border-[#ded1ba] bg-[#faf6ee] '+(mobile?'mx-auto max-w-[360px]':'')} sandbox="" srcDoc={email.html}/>
 </div>;
}

'use client';
import {useState} from 'react';
import {cropRectangle,frameFor,originalFrame,originalFraming,type Framing,type Frame} from '@/lib/notes-framing';
type Context='default'|'archive'|'reading'|'email';
export function PrivatePhotographFraming({image,value,onChange,disabled=false}:{image:string;value:Framing|null;onChange:(v:Framing)=>void;disabled?:boolean}){
 const [context,setContext]=useState<Context>('default');
 const [size,setSize]=useState({width:0,height:0});
 const framing=value??originalFraming;
 const frame=frameFor(framing,context);
 const change=(patch:Partial<Frame>)=>onChange({...framing,[context]:{...frame,...patch}});
 const crop=size.width&&size.height?cropRectangle(size.width,size.height,frame):null;
 return <details className="mt-5 border-t border-[#ded1ba] pt-4">
  <summary className="cursor-pointer font-serif text-lg">Adjust photograph framing</summary>
  <p className="my-3 text-xs leading-5 text-[#675f53]">The original photograph is preserved. Set different framing for the archive, reading page and email. Save the draft to keep your adjustments.</p>
  <fieldset disabled={disabled} className="space-y-4">
   <label className="block text-xs font-semibold">Presentation
    <select className="mt-2 w-full rounded border border-[#d5c7ae] bg-white p-2" value={context} onChange={e=>setContext(e.target.value as Context)}>
     <option value="default">Default · all presentations</option><option value="archive">Window Journey archive</option><option value="reading">Reading page</option><option value="email">Email</option>
    </select>
   </label>
   {context!=='default'&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!framing[context]} onChange={e=>{const updated={...framing};if(e.target.checked)updated[context]={...frame};else delete updated[context];onChange(updated);}}/>Use separate framing for this presentation</label>}
   <div role="group" aria-label="Photograph crop preview" className="relative mx-auto w-full max-w-[320px] overflow-hidden border border-[#d5c7ae] bg-[#e7dfd1]" style={{aspectRatio:crop?String(crop.width/crop.height):'4 / 3'}}>
    <img src={image} alt="Photograph crop preview" draggable={false} onLoad={e=>{const img=e.currentTarget;setSize({width:img.naturalWidth,height:img.naturalHeight});}} className="absolute max-w-none" style={crop?{width:(size.width/crop.width*100)+'%',height:(size.height/crop.height*100)+'%',left:(-crop.left/crop.width*100)+'%',top:(-crop.top/crop.height*100)+'%'}:{width:'100%',height:'100%',objectFit:'contain'}}/>
   </div>
   <label className="block text-xs font-semibold">Aspect ratio
    <select className="mt-2 w-full rounded border border-[#d5c7ae] bg-white p-2" value={frame.ratio} onChange={e=>change({ratio:e.target.value as Frame['ratio']})}>
     <option value="original">Original proportions</option><option value="portrait">Portrait · 3:4</option><option value="landscape">Landscape · 3:2</option><option value="square">Square · 1:1</option>
    </select>
   </label>
   {([['zoom','Zoom',1,3,.01],['x','Horizontal position',0,1,.01],['y','Vertical position',0,1,.01]] as const).map(([key,label,min,max,step])=><label className="block text-xs font-semibold" key={key}>{label} · {key==='zoom'?Math.round(frame.zoom*100)+'%':Math.round(frame[key]*100)+'%'}
    <input className="mt-2 block w-full" aria-label={label} type="range" min={min} max={max} step={step} value={frame[key]} onChange={e=>change({[key]:Number(e.target.value)} as Partial<Frame>)}/>
   </label>)}
   <button type="button" className="rounded border border-[#d5c7ae] bg-white px-3 py-2 text-xs" onClick={()=>onChange({...framing,[context]:{...originalFrame}})}>Reset to original framing</button>
  </fieldset>
 </details>;
}

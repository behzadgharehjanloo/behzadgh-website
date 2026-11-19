'use client';
import {useRef,useState} from 'react';
import {StudioIcon} from './StudioIcon';
import {cropRectangle,frameFor,originalFrame,originalFraming,type Frame,type Framing} from '@/lib/notes-framing';

// Restored Local PhotographFraming: pointer-drag, keyboard arrows, +/- zoom, per-context crops.
type Context='default'|'archive'|'reading'|'email';
export function PrivatePhotographFraming({image,value,onChange,disabled=false}:{image:string;value:Framing|null;onChange:(v:Framing)=>void;disabled?:boolean}){
 const [context,setContext]=useState<Context>('default');
 const [size,setSize]=useState({width:0,height:0});
 const drag=useRef<{x:number;y:number;positionX:number;positionY:number;pixelWidth:number;pixelHeight:number}|null>(null);
 const framing=value??originalFraming;
 const frame=frameFor(framing,context);
 const crop=size.width&&size.height?cropRectangle(size.width,size.height,frame):null;
 const change=(patch:Partial<Frame>)=>onChange({...framing,[context]:{...frame,...patch}});
 const clamp=(n:number)=>Math.max(0,Math.min(1,n));
 const baseInput='mt-2 w-full rounded border border-[#d5c7ae] bg-white p-2 text-sm';
 return <details id="studio-image-editor" className="group mt-3 rounded-xl border border-[#e0d3c0] bg-[#fffdf9] p-3">
   <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 font-serif text-lg text-[#203347] [&::-webkit-details-marker]:hidden"><StudioIcon name="sliders"/><span>Edit image</span><StudioIcon name="chevron" className="ml-auto transition-transform group-open:rotate-180"/></summary>
   <p className="sr-only" id="framing-help">Drag the image to reposition, or use arrow keys. Plus and minus change zoom.</p>
   <fieldset disabled={disabled} className="mt-3 space-y-3"><legend className="sr-only">Photograph framing</legend>
    <label className="block text-xs font-semibold">Presentation
     <select className={baseInput} value={context} onChange={e=>setContext(e.target.value as Context)}>
      <option value="default">Default · all presentations</option>
      <option value="archive">Window Journey archive</option><option value="reading">Reading page</option><option value="email">Email</option>
     </select>
    </label>
    {context!=='default'&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!framing[context]} onChange={e=>{const next={...framing};if(e.target.checked)next[context]={...frame};else delete next[context];onChange(next);}}/>Use separate framing for this presentation</label>}
    <div role="group" aria-label="Photograph crop preview" aria-describedby="framing-help" tabIndex={disabled?-1:0}
      className="relative mx-auto max-w-full overflow-hidden rounded-md border border-[#d5c7ae] bg-[#e7dfd1] outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#86622c]"
      style={{aspectRatio:crop?String(crop.width/crop.height):'4 / 3',width:crop?`min(100%, ${430*crop.width/crop.height}px)`:'100%',maxWidth:430,touchAction:'none',minHeight:crop?undefined:190,cursor:disabled?'default':'grab'}}
      onPointerDown={e=>{if(disabled||!crop)return;e.currentTarget.setPointerCapture(e.pointerId);const b=e.currentTarget.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,positionX:frame.x,positionY:frame.y,pixelWidth:b.width,pixelHeight:b.height};}}
      onPointerMove={e=>{const start=drag.current;if(!start||!crop||disabled)return;const dx=(size.width-crop.width)/crop.width*start.pixelWidth,dy=(size.height-crop.height)/crop.height*start.pixelHeight;change({x:dx?clamp(start.positionX-(e.clientX-start.x)/dx):0.5,y:dy?clamp(start.positionY-(e.clientY-start.y)/dy):0.5});}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
      onKeyDown={e=>{if(disabled)return;const step=e.shiftKey?0.1:0.02;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')change({x:clamp(frame.x+step)});if(e.key==='ArrowRight')change({x:clamp(frame.x-step)});if(e.key==='ArrowUp')change({y:clamp(frame.y+step)});if(e.key==='ArrowDown')change({y:clamp(frame.y-step)});if(['+','='].includes(e.key))change({zoom:Math.min(3,frame.zoom+.1)});if(['-','_'].includes(e.key))change({zoom:Math.max(1,frame.zoom-.1)});}}}>
      <img src={image} draggable={false} alt="Current photograph framing" onLoad={event=>{const img=event.currentTarget;setSize({width:img.naturalWidth,height:img.naturalHeight});}}
       className="pointer-events-none select-none"
       style={crop?{position:'absolute',maxWidth:'none',width:`${size.width/crop.width*100}%`,height:`${size.height/crop.height*100}%`,left:`${-crop.left/crop.width*100}%`,top:`${-crop.top/crop.height*100}%`}:{width:'100%',height:'100%',objectFit:'contain'}}/>
    </div>
    <div className="mt-2 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Photograph zoom controls">
     <button type="button" aria-label="Zoom out" title="Zoom out" disabled={disabled||frame.zoom<=1}
      onClick={()=>change({zoom:Math.max(1,Math.round((frame.zoom-0.1)*100)/100)})}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#c5b69e] bg-[#fffdf9] px-3 text-xl font-semibold text-[#203347] hover:bg-[#f0e8da] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#957749] disabled:cursor-not-allowed disabled:opacity-35">−</button>
     <output aria-live="polite" aria-label="Current zoom" className="min-w-[68px] text-center text-sm font-semibold tabular-nums text-[#203347]">{Math.round(frame.zoom*100)}%</output>
     <button type="button" aria-label="Zoom in" title="Zoom in" disabled={disabled||frame.zoom>=3}
      onClick={()=>change({zoom:Math.min(3,Math.round((frame.zoom+0.1)*100)/100)})}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[#c5b69e] bg-[#fffdf9] px-3 text-xl font-semibold text-[#203347] hover:bg-[#f0e8da] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#957749] disabled:cursor-not-allowed disabled:opacity-35">+</button>
     <button type="button" disabled={disabled} onClick={()=>change({zoom:1,x:0.5,y:0.5})}
      className="min-h-11 rounded-md border border-[#c5b69e] bg-[#fffdf9] px-3 text-xs font-semibold text-[#203347] hover:bg-[#f0e8da] disabled:cursor-not-allowed disabled:opacity-35">Reset</button>
    </div>
    <label className="block text-xs font-semibold">Aspect ratio
     <select className={baseInput} value={frame.ratio} onChange={e=>change({ratio:e.target.value as Frame['ratio']})}>
      <option value="original">Original proportions</option><option value="portrait">Portrait · 3:4</option><option value="landscape">Landscape · 3:2</option><option value="square">Square · 1:1</option>
     </select>
    </label>
    {([['x','Horizontal position',0,1,.01],['y','Vertical position',0,1,.01]] as const).map(([key,label,min,max,step])=><label className="block text-xs font-semibold" key={key}>{label} · {Math.round(frame[key]*100)+'%'}
     <input className="mt-2 block w-full" type="range" min={min} max={max} step={step} value={frame[key]} onChange={e=>change({[key]:Number(e.target.value)} as Partial<Frame>)}/>
    </label>)}
    <button type="button" className="min-h-9 rounded border border-[#d5c7ae] bg-white px-3 py-2 text-xs" onClick={()=>onChange({...framing,[context]:{...originalFrame}})}>Reset framing</button>
   </fieldset>
  </details>;
}

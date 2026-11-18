'use client';
import {useRef,useState} from 'react';
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
 return <details className="mt-5 border-t border-[#ded1ba] pt-4">
   <summary className="cursor-pointer font-serif text-lg">Adjust photograph</summary>
   <p className="my-3 text-xs leading-5 text-[#675f53]" id="framing-help">Drag to reposition. Arrow keys move the photograph; + and − adjust zoom. Your original stays unchanged.</p>
   <fieldset disabled={disabled} className="space-y-4"><legend className="sr-only">Photograph framing</legend>
    <label className="block text-xs font-semibold">Presentation
     <select className={baseInput} value={context} onChange={e=>setContext(e.target.value as Context)}>
      <option value="default">Default · all presentations</option>
      <option value="archive">Window Journey archive</option><option value="reading">Reading page</option><option value="email">Email</option>
     </select>
    </label>
    {context!=='default'&&<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!framing[context]} onChange={e=>{const next={...framing};if(e.target.checked)next[context]={...frame};else delete next[context];onChange(next);}}/>Use separate framing for this presentation</label>}
    <div role="group" aria-label="Photograph crop preview" aria-describedby="framing-help" tabIndex={disabled?-1:0}
      className="relative mx-auto max-w-full overflow-hidden border border-[#d5c7ae] bg-[#e7dfd1] outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#86622c]"
      style={{aspectRatio:crop?String(crop.width/crop.height):'4 / 3',width:crop?`min(100%, ${430*crop.width/crop.height}px)`:'100%',maxWidth:430,touchAction:'none',minHeight:crop?undefined:190,cursor:disabled?'default':'grab'}}
      onPointerDown={e=>{if(disabled||!crop)return;e.currentTarget.setPointerCapture(e.pointerId);const b=e.currentTarget.getBoundingClientRect();drag.current={x:e.clientX,y:e.clientY,positionX:frame.x,positionY:frame.y,pixelWidth:b.width,pixelHeight:b.height};}}
      onPointerMove={e=>{const start=drag.current;if(!start||!crop||disabled)return;const dx=(size.width-crop.width)/crop.width*start.pixelWidth,dy=(size.height-crop.height)/crop.height*start.pixelHeight;change({x:dx?clamp(start.positionX-(e.clientX-start.x)/dx):0.5,y:dy?clamp(start.positionY-(e.clientY-start.y)/dy):0.5});}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
      onKeyDown={e=>{if(disabled)return;const step=e.shiftKey?.1:.02;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','_'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')change({x:clamp(frame.x+step)});if(e.key==='ArrowRight')change({x:clamp(frame.x-step)});if(e.key==='ArrowUp')change({y:clamp(frame.y+step)});if(e.key==='ArrowDown')change({y:clamp(frame.y-step)});if(['+','='].includes(e.key))change({zoom:Math.min(3,frame.zoom+.1)});if(['-','_'].includes(e.key))change({zoom:Math.max(1,frame.zoom-.1)});}}}>
      <img src={image} draggable={false} alt="Current photograph framing" onLoad={event=>{const img=event.currentTarget;setSize({width:img.naturalWidth,height:img.naturalHeight});}}
       className="pointer-events-none select-none"
       style={crop?{position:'absolute',maxWidth:'none',width:`${size.width/crop.width*100}%`,height:`${size.height/crop.height*100}%`,left:`${-crop.left/crop.width*100}%`,top:`${-crop.top/crop.height*100}%`}:{width:'100%',height:'100%',objectFit:'contain'}}/>
    </div>
    <label className="block text-xs font-semibold">Aspect ratio
     <select className={baseInput} value={frame.ratio} onChange={e=>change({ratio:e.target.value as Frame['ratio']})}>
      <option value="original">Original proportions</option><option value="portrait">Portrait · 3:4</option><option value="landscape">Landscape · 3:2</option><option value="square">Square · 1:1</option>
     </select>
    </label>
    {([['zoom','Zoom',1,3,.01],['x','Horizontal position',0,1,.01],['y','Vertical position',0,1,.01]] as const).map(([key,label,min,max,step])=><label className="block text-xs font-semibold" key={key}>{label} · {key==='zoom'?Math.round(frame.zoom*100)+'%':Math.round(frame[key]*100)+'%'}
     <input className="mt-2 block w-full" type="range" min={min} max={max} step={step} value={frame[key]} onChange={e=>change({[key]:Number(e.target.value)} as Partial<Frame>)}/>
    </label>)}
    <button type="button" className="rounded border border-[#d5c7ae] bg-white px-3 py-2 text-xs" onClick={()=>onChange({...framing,[context]:{...originalFrame}})}>Reset to original framing</button>
   </fieldset>
  </details>;
}

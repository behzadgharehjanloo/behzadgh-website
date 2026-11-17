'use client';
import {useEffect,useId,useRef,useState,type PointerEvent} from 'react';
export type AnalyticsPoint={label:string;value:number|null;secondary?:number;detail?:string;n?:number};
export function AnalyticsLineChart({points,label,primary='Membership additions',secondary='Exits',score=false,compact=false,unitLabel}: {points:AnalyticsPoint[];label:string;primary?:string;secondary?:string;score?:boolean;compact?:boolean;unitLabel?:string}) {
 const container=useRef<HTMLDivElement>(null),id=useId().replaceAll(':','');
 const [width,setWidth]=useState(compact?340:760),[selected,setSelected]=useState<number|null>(null);
 useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(entries=>setWidth(Math.max(260,entries[0].contentRect.width)));observer.observe(container.current);return()=>observer.disconnect();},[]);
 const left=38,right=16,top=20,bottom=43,height=compact?190:255,plot=width-left-right;
 const values=points.flatMap(p=>p.value===null?[]:[p.value,...p.secondary===undefined?[]:[p.secondary]]);
 const max=score?10:Math.max(1,...values),min=score?1:0;
 const x=(i:number)=>left+(points.length<2?plot/2:i/(points.length-1)*plot),y=(v:number)=>top+(max-v)/(max-min)*(height-top-bottom);
 const segments:number[][]=[];let segment:number[]=[];points.forEach((p,i)=>{if(p.value===null){if(segment.length)segments.push(segment);segment=[];}else segment.push(i);});if(segment.length)segments.push(segment);
 const path=(indices:number[])=>indices.map((i,j)=>`${j?'L':'M'}${x(i)},${y(points[i].value!)}`).join(' ');
 const index=selected===null?null:Math.min(selected,Math.max(0,points.length-1)),point=index===null?null:points[index];
 const tickIndices=[...new Set([0,Math.floor((points.length-1)/2),points.length-1])].filter(i=>i>=0),ticks=score?[1,4,7,10]:[...new Set([0,Math.ceil(max/2),max])],hasSecondary=points.some(p=>p.secondary!==undefined);
 const inspect=(e:PointerEvent<SVGSVGElement>)=>{const rect=e.currentTarget.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,((e.clientX-rect.left)*width/rect.width-left)/plot));setSelected(Math.round(ratio*Math.max(0,points.length-1)));};
 return <div ref={container} className={"analytics-line-chart"+(compact?" analytics-line-compact":"")}>
  <div className="analytics-legend"><span><i className="analytics-dot growth"/>{primary}</span>{hasSecondary&&<span><i className="analytics-dot friction"/>{secondary}</span>}<small>{unitLabel??(score?'Score / 10':'Memberships per bucket')}</small></div>
  <div className="analytics-chart-readout" role="status" aria-live="polite">{point?<><strong>{point.label}</strong><span>{point.value===null?'No responses':`${primary}: ${point.value}${score?' / 10':''}`}{point.n!==undefined?` · n = ${point.n}`:''}{point.secondary!==undefined?` · ${secondary}: ${point.secondary}`:''}</span>{point.detail&&<small>{point.detail}</small>}</>:<><strong>{label}</strong><span>Hover, touch, or use the keyboard slider to inspect.</span></>}</div>
  {values.length>0&&<svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={label} onPointerMove={inspect} onPointerDown={inspect} onPointerLeave={()=>setSelected(null)}>
   <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#597d96" stopOpacity=".24"/><stop offset="100%" stopColor="#597d96" stopOpacity=".025"/></linearGradient></defs>
   {ticks.map(t=><g key={t}><line x1={left} x2={width-right} y1={y(t)} y2={y(t)} stroke="#e5e1d8" strokeDasharray="3 5"/><text x={left-10} y={y(t)+4} textAnchor="end" fontSize="11" fill="#646c70">{t}</text></g>)}
   {segments.map((indices,i)=><g key={i}>{indices.length>1&&<path d={`${path(indices)} L${x(indices.at(-1)!)},${height-bottom} L${x(indices[0])},${height-bottom} Z`} fill={`url(#${id})`}/>}<path d={path(indices)} fill="none" stroke="#597d96" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></g>)}
   {hasSecondary&&<path d={points.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.secondary??0)}`).join(' ')} fill="none" stroke="#ad725e" strokeWidth="2" strokeDasharray="5 4"/>}
   {points.map((p,i)=>p.value===null?<text key={i} x={x(i)} y={height-bottom-9} textAnchor="middle" fontSize="11" fill="#646c70">—</text>:(score||points.length<15||i===index)&&<circle key={i} cx={x(i)} cy={y(p.value)} r={i===index?5:3.5} fill="#597d96" stroke="#fffdf8" strokeWidth="2"/>)}
   {index!==null&&<line x1={x(index)} x2={x(index)} y1={top} y2={height-bottom} stroke="#8d979c" strokeDasharray="3 4"/>}
   {tickIndices.map(i=><text key={i} x={x(i)} y={height-15} textAnchor={i===0?'start':i===points.length-1?'end':'middle'} fontSize="11" fill="#646c70">{score?`${points[i].label} · n=${points[i].n??0}`:points[i].label}</text>)}
  </svg>}
  {values.length>0&&points.length>0&&<label className="analytics-explore"><span>Explore {score?'Notes':'dates'}</span><input aria-label={`Explore ${label}`} type="range" min="0" max={Math.max(0,points.length-1)} step="1" value={index??0} onChange={e=>setSelected(Number(e.target.value))} onFocus={()=>setSelected(index??0)}/></label>}
  {!values.length&&<p className="analytics-empty">No observations yet. Missing data is not zero.</p>}
 </div>;
}

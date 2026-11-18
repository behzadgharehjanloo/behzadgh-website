'use client';
import {useState} from 'react';
import {cropRectangle,frameFor,originalFraming,type Framing} from '@/lib/notes-framing';
import './original-window-journey.css';

type Draft={title:string;body:string;imageAlt:string;narrator:'Behzad'|'Steven';imageCaption:string;framing:Framing|null};

// The original Local NoteReading/StudioReadingPreview markup, adapted only to
// the existing Production Draft property names. Never rewrites the user's text.
export function StudioReadingPreview({draft,image}:{draft:Draft;image?:string}){
 const [dimensions,setDimensions]=useState({width:0,height:0});
 const frame=frameFor(draft.framing??originalFraming,'reading');
 const crop=dimensions.width&&dimensions.height?cropRectangle(dimensions.width,dimensions.height,frame):null;
 const navigation=<nav className="wj-reading-nav wj-reading-nav-top" aria-label="Draft preview navigation"><span>Previous Note</span><span>Private draft preview</span><span>Next Note</span></nav>;
 return <div className="studio-window-journey bg-[#faf6ee]">
  <article className="wj-reading">
   {navigation}
   <div className="wj-reading-layout">
    <div className="wj-reading-text">
     <p className="wj-position">Private draft · Reading preview</p>
     <h1>{draft.title||'Untitled Note'}</h1>
     <div className="wj-story"><div style={{whiteSpace:'pre-wrap'}}>{draft.body}</div></div>
    </div>
    <figure className="wj-reading-photo">
     {image?<div className="relative w-full overflow-hidden" style={{aspectRatio:crop?String(crop.width/crop.height):'4 / 3'}}><img className="wj-photo wj-memory-photo" src={image} alt={draft.imageAlt} onLoad={event=>{const img=event.currentTarget;setDimensions({width:img.naturalWidth,height:img.naturalHeight});}} style={crop?{position:'absolute',maxWidth:'none',width:(dimensions.width/crop.width*100)+'%',height:(dimensions.height/crop.height*100)+'%',left:(-crop.left/crop.width*100)+'%',top:(-crop.top/crop.height*100)+'%'}:{width:'100%',height:'100%',objectFit:'contain'}}/></div>:<div className="grid min-h-[280px] place-content-center border border-dashed border-[#cfc4b0] p-5 text-center text-sm text-[#606364]">Photograph not added</div>}
     {draft.imageCaption&&<figcaption>{draft.imageCaption}</figcaption>}
    </figure>
   </div>
   <nav className="wj-reading-nav wj-reading-nav-bottom"><span>Draft only · Not published</span></nav>
  </article>
 </div>;
}

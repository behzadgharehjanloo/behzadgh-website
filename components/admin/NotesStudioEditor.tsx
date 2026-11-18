'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {StudioReadingPreview} from './notes/StudioReadingPreview';
import {StudioEmailPreview} from './notes/StudioEmailPreview';
import {savedTime} from '@/lib/notes-studio-save-time';
import {PrivatePhotographFraming} from './notes/PrivatePhotographFraming';
import type {Framing} from '@/lib/notes-framing';
import {readLocalPhotographPreview,localEmailPhotographPreview,prepareLocalPhotoUpload} from '@/lib/notes-photo-local-preview';

type Note={id:string;slug:string;title:string;body:string;image_alt:string;state:'draft'|'scheduled'|'published'|'cancelled';paused:boolean;revision:number;scheduled_at:string|null;published_at:string|null;narrator:'Behzad'|'Steven';excerpt:string;image_caption:string;seo_description:string;created_at?:string;updated_at?:string;photo_id:string|null;photo_framing:Framing|null};
type Draft={slug:string;title:string;body:string;imageAlt:string;narrator:'Behzad'|'Steven';excerpt:string;imageCaption:string;seoDescription:string;framing:Framing|null};
type HistoricalNote={note_id:string;revision:number;title:string;body:string;narrator:'Behzad'|'Steven';saved_at:string;slug:string;image_alt:string;excerpt:string;image_caption:string;seo_description:string;photo_id:string|null;photo_framing:Framing|null};
type View='notes'|'calendar'|'delivery';
type Preview='website'|'email';
const blank:Draft={slug:'',title:'',body:'',imageAlt:'',narrator:'Behzad',excerpt:'',imageCaption:'',seoDescription:'',framing:null};
const primary='inline-flex min-h-11 items-center justify-center rounded-md bg-[#172d42] px-5 py-2.5 text-sm font-medium text-[#fffdf8] transition hover:bg-[#29445b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b08a4c] disabled:cursor-not-allowed disabled:opacity-40';
const secondary='inline-flex min-h-11 items-center justify-center rounded-md border border-[#d4c4aa] bg-[#fffdf8] px-4 py-2.5 text-sm font-medium text-[#172d42] transition hover:bg-[#f3ebdf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b08a4c] disabled:cursor-not-allowed disabled:opacity-40';
const field='mt-2 w-full rounded-md border border-[#d9cdbb] bg-[#fffefa] px-4 py-3 text-[15px] text-[#172d42] outline-none transition focus:border-[#9a753b] focus:ring-2 focus:ring-[#b99a68]/20 disabled:bg-[#f3efe7]';
const panel='rounded-xl border border-[#ded3c3] bg-[#fffdf9] shadow-[0_8px_28px_rgba(21,37,50,0.035)]';
const displayDate=(value:string|null|undefined)=>value?new Date(value).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'America/New_York'}):'—';
const dateKey=(value:string)=>new Date(value).toLocaleDateString('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/New_York'});
const titleFor=(note:Note)=>note.title||'Untitled Note';
function slugFromTitle(title:string){return title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75).replace(/-$/,'');}
function countWords(body:string){return body.trim()?body.trim().split(/\s+/).length:0;}
function statusLabel(note:Note){return note.paused?'Paused':note.state[0].toUpperCase()+note.state.slice(1);}
function Pill({note}:{note:Note}){return <span className={'inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium '+(note.state==='published'?'border-[#bbcfbd] bg-[#eef4ee] text-[#3d654b]':note.state==='scheduled'?'border-[#dec69a] bg-[#fbf3e2] text-[#805f28]':'border-[#dfd7cb] bg-[#f5f0e8] text-[#675f53]')}>{statusLabel(note)}</span>;}
async function action(payload:Record<string,unknown>){
 const response=await fetch('/api/admin/notes-studio',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await response.json();
 if(!response.ok)throw new Error(data.error??'The operation could not be completed.');
 return data;
}

export function NotesStudioEditor({initialNotes,deliveryEnabled}:{initialNotes:Note[];deliveryEnabled:boolean}){
 const [notes,setNotes]=useState(initialNotes);
 const [view,setView]=useState<View>('notes');
 const [selection,setSelection]=useState<string|null>(null);
 const [draft,setDraft]=useState<Draft>(blank);
 const [saved,setSaved]=useState<Draft>(blank);
 const [revision,setRevision]=useState<number|null>(null);
 const [state,setState]=useState<Note['state']>('draft');
 const [paused,setPaused]=useState(false);
 const [search,setSearch]=useState('');
 const [previewMode,setPreviewMode]=useState<Preview>('website');
 const [editorTab,setEditorTab]=useState<'edit'|'website'|'email'>('edit');
 const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
 const [previewHtml,setPreviewHtml]=useState('');
 const [previewOpen,setPreviewOpen]=useState(false);
 const [scheduleDate,setScheduleDate]=useState('');
 const [testEmail,setTestEmail]=useState('');
 const [test,setTest]=useState<{id:string;recipient:string;subject:string}|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [emailImage,setEmailImage]=useState<string|undefined>(undefined);
 const [pendingPhoto,setPendingPhoto]=useState<File|null>(null);
 const [pendingPhotoUrl,setPendingPhotoUrl]=useState<string|undefined>();
 const [pendingEmailData,setPendingEmailData]=useState<string|undefined>();
 const [photoReading,setPhotoReading]=useState(false);
 const [photoProblem,setPhotoProblem]=useState('');
 const photoValidationController=useRef<AbortController|null>(null);
 const photoPickNumber=useRef(0);
 useEffect(()=>()=>{if(pendingPhotoUrl)URL.revokeObjectURL(pendingPhotoUrl);},[pendingPhotoUrl]);
 useEffect(()=>()=>photoValidationController.current?.abort(),[]);
 const [history,setHistory]=useState<HistoricalNote[]|null>(null);
 const [historyOpen,setHistoryOpen]=useState(false);
 const [historySelected,setHistorySelected]=useState<number|null>(null);
 const [month,setMonth]=useState(()=>{const today=new Date();return new Date(today.getFullYear(),today.getMonth(),1);});
 const selected=notes.find(n=>n.id===selection);
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved)||pendingPhoto!==null;
 // Parity with the verified local NoteEditor: protect unsaved memoir text.
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
  const navigation=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const anchor=event.target instanceof Element?event.target.closest('a'):null;
   if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
   if(!window.confirm('Leave this draft? Unsaved changes will be lost.')){
    event.preventDefault();event.stopPropagation();
   }
  };
  window.addEventListener('beforeunload',warn);
  document.addEventListener('click',navigation,true);
  return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',navigation,true);};
 },[dirty]);
 const editable=state==='draft';
 const searched=useMemo(()=>notes.filter(n=>[n.title,n.slug,n.state].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[notes,search]);
 const counts={drafts:notes.filter(n=>n.state==='draft').length,scheduled:notes.filter(n=>n.state==='scheduled').length,published:notes.filter(n=>n.state==='published').length};
 function guardUnsaved(){return !dirty||window.confirm('You have unsaved changes. Leave this draft without saving?');}
 async function showHistory(){
  if(!selection)return;
  setHistoryOpen(true);setHistorySelected(null);
  await run(async()=>{
   const result=await action({action:'history',id:selection});
   setHistory(result.revisions as HistoricalNote[]);
  });
 }
 function choose(n:Note){
  if(!guardUnsaved())return;
  setPendingPhoto(null);
  setHistory(null);setHistoryOpen(false);setHistorySelected(null);
  const values={title:n.title,slug:n.slug,body:n.body,imageAlt:n.image_alt,narrator:n.narrator??'Behzad',excerpt:n.excerpt??'',imageCaption:n.image_caption??'',seoDescription:n.seo_description??'',framing:n.photo_framing??null};
  setSelection(n.id);setDraft(values);setSaved(values);setRevision(n.revision);
  setState(n.state);setPaused(n.paused);setPreviewOpen(false);setPreviewHtml('');setEditorTab('edit');
  setScheduleDate(n.scheduled_at?new Date(n.scheduled_at).toLocaleString('sv-SE').replace(' ','T').slice(0,16):'');
  setTest(null);setMessage('');setView('notes');
 }
 function fresh(){
  if(!guardUnsaved())return;
  setPendingPhoto(null);
  setHistory(null);setHistoryOpen(false);setHistorySelected(null);
  setSelection(null);setDraft(blank);setSaved(blank);setRevision(null);setState('draft');setPaused(false);
  setPreviewOpen(false);setPreviewHtml('');setEditorTab('edit');setTest(null);setMessage('');setView('notes');
 }
 function incorporate(n:Note){
  setHistory(null);setHistorySelected(null);
  setNotes(prev=>[n,...prev.filter(x=>x.id!==n.id)]);
  const values={title:n.title,slug:n.slug,body:n.body,imageAlt:n.image_alt,narrator:n.narrator??'Behzad',excerpt:n.excerpt??'',imageCaption:n.image_caption??'',seoDescription:n.seo_description??'',framing:n.photo_framing??null};
  setSelection(n.id);setDraft(values);setSaved(values);setRevision(n.revision);setState(n.state);setPaused(n.paused);
  setTest(null);
 }
 async function selectPhotograph(file:File){
  const number=++photoPickNumber.current;
  photoValidationController.current?.abort();
  const controller=new AbortController();photoValidationController.current=controller;
  setPhotoProblem('');setPhotoReading(true);
  setMessage('Checking selected photograph…');
  try{
   // The same decoded, dimension-checked 10 MB preview process approved in Local.
   const url=await readLocalPhotographPreview(file,controller.signal);
   if(controller.signal.aborted||number!==photoPickNumber.current){URL.revokeObjectURL(url);return;}
   let emailPreview:string|undefined;
   try{emailPreview=await localEmailPhotographPreview(url);}catch{emailPreview=undefined;}
   if(controller.signal.aborted||number!==photoPickNumber.current){URL.revokeObjectURL(url);return;}
   setPendingPhotoUrl(url);setPendingEmailData(emailPreview);setPendingPhoto(file);
   setDraft(current=>({...current,framing:null}));
   setMessage('Photograph checked and loaded. Adjust crop and zoom before Save.');
   if(file.size>3*1024*1024)setPhotoProblem('This original is larger than current 3 MiB online storage. On Save, an optimized JPEG copy will be stored. Your original file stays unchanged on your computer.');
  }catch(error){
   if(number!==photoPickNumber.current||controller.signal.aborted)return;
   const message=error instanceof Error?error.message:'The photograph could not be read.';
   setPhotoProblem(message+' Your previously selected photograph remains unchanged.');
   setMessage(message);
  }finally{
   if(number===photoPickNumber.current){setPhotoReading(false);photoValidationController.current=null;}
  }
 }
 async function run(fn:()=>Promise<void>){
  if(busy)return;
  setBusy(true);setMessage('');
  try{await fn();}catch(error){setMessage(error instanceof Error?error.message:'The operation was unavailable.');}
  finally{setBusy(false);}
 }
 function edit<K extends keyof Draft>(key:K,value:Draft[K]){setDraft(v=>({...v,[key]:value}));setPreviewOpen(false);setTest(null);}
 function openView(next:View){
  if(next!==view&&view==='notes'&&!guardUnsaved())return;
  setView(next);setMessage('');
 }
 const url=selection?'/notes/'+(selected?.slug??draft.slug):'';
 const displayImage=pendingPhotoUrl??(selection&&selected?.photo_id?'/api/admin/notes-studio/photo?noteId='+encodeURIComponent(selection)+'&assetId='+encodeURIComponent(selected.photo_id):undefined);
 const imageUrl=selection&&selected?.photo_id?'/api/admin/notes-studio/photo?noteId='+encodeURIComponent(selection)+'&assetId='+encodeURIComponent(selected.photo_id):undefined;
 useEffect(()=>{
  setEmailImage(undefined);
  if(!imageUrl)return;
  const abort=new AbortController();
  void fetch(imageUrl,{credentials:'same-origin',cache:'no-store',signal:abort.signal}).then(async response=>{if(!response.ok)throw Error('Image unavailable');return response.blob();}).then(blob=>{
   if(abort.signal.aborted)return;
   const reader=new FileReader();
   reader.onload=()=>{if(!abort.signal.aborted&&typeof reader.result==='string')setEmailImage(reader.result);};
   reader.readAsDataURL(blob);
  }).catch(()=>{});
  return()=>abort.abort();
 },[imageUrl]);
 const firstDay=new Date(month.getFullYear(),month.getMonth(),1).getDay();
 const daysInMonth=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const squares=Array.from({length:Math.ceil((firstDay+daysInMonth)/7)*7},(_,i)=>i-firstDay+1);
 const scheduled=notes.filter(n=>n.state==='scheduled'&&n.scheduled_at);
 return <div className="mt-7 overflow-hidden rounded-2xl border border-[#ded3c3] bg-[#f8f4ed] text-[#172d42] shadow-[0_16px_46px_rgba(21,37,50,0.05)]">
  <div className="flex flex-col justify-between gap-4 border-b border-[#ded3c3] bg-[#fffdf8] px-5 py-5 md:flex-row md:items-center md:px-7">
   <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#987b4e]">PRIVATE EDITORIAL WORKSPACE</p><h2 className="mt-1 font-serif text-[27px] font-normal leading-tight md:text-[33px]">Notes Studio</h2><p className="mt-1 text-xs text-[#766c60]">Write, review and prepare your letters without altering the original voice.</p></div>
   <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#decfae] bg-[#faf3e5] px-3 py-1.5 text-[11px] font-medium text-[#79603a]">Private workspace</span><span className="rounded-full border border-[#d7ded3] bg-[#edf2ea] px-3 py-1.5 text-[11px] font-medium text-[#50604c]">{deliveryEnabled?'Delivery enabled':'Public delivery off'}</span><button type="button" className={primary} onClick={fresh}>+ New Note</button></div>
  </div>
  <div className="grid min-h-[760px] lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[222px_minmax(0,1fr)]">
   <aside className="border-b border-[#d8ccb8] bg-[#203347] px-4 py-6 text-[#f7efe1] lg:border-b-0 lg:border-r lg:border-r-[#d8ccb8]">
    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c3ad86]">WORKSPACE</p>
    <nav aria-label="Notes Studio sections" className="mt-4 flex flex-wrap gap-1 lg:flex-col">
     {([['notes','All Notes'],['calendar','Publication Calendar'],['delivery','Delivery & Status']] as const).map(([key,label])=><button key={key} type="button" onClick={()=>openView(key)} aria-current={view===key?'page':undefined} className={'w-full rounded-lg px-3 py-3 text-left text-[13px] transition sm:w-auto lg:w-full '+(view===key?'bg-[#e9dcc5] font-semibold text-[#172d42]':'text-[#e6ddd0] hover:bg-white/10')}>{label}</button>)}
    </nav>
    <div className="mt-8 hidden border-t border-white/15 pt-6 lg:block"><p className="px-3 text-[10px] uppercase tracking-[0.17em] text-[#c3ad86]">At a glance</p><dl className="mt-3 space-y-3 px-3 text-xs"><div className="flex justify-between"><dt>Drafts</dt><dd>{counts.drafts}</dd></div><div className="flex justify-between"><dt>Scheduled</dt><dd>{counts.scheduled}</dd></div><div className="flex justify-between"><dt>Published</dt><dd>{counts.published}</dd></div></dl></div>
    <a href="/admin" className="mt-9 hidden border-t border-white/15 px-3 pt-5 text-xs text-[#e9dcc5] underline underline-offset-4 lg:block">Back to Dashboard</a>
   </aside>
   <div className="min-w-0 p-4 md:p-6 xl:p-8">
   {view==='notes'&&<div className="grid gap-5 xl:grid-cols-[minmax(210px,0.85fr)_minmax(0,2.15fr)]">
    <section className={panel+' self-start p-4'}>
     <div className="flex items-center justify-between gap-3"><h3 className="font-serif text-xl">My Notes</h3><span className="text-xs text-[#81776b]">{notes.length} total</span></div>
     <label htmlFor="studio-search" className="sr-only">Search Notes</label>
     <input id="studio-search" className={field+' text-sm'} placeholder="Search Notes..." value={search} onChange={e=>setSearch(e.target.value)}/>
     <div className="mt-4 max-h-[630px] space-y-2 overflow-y-auto">
     {searched.length===0?<div className="rounded-lg border border-dashed border-[#d6cbb9] p-5 text-center"><p className="font-serif text-lg">{notes.length?'No matching Notes':'Your Notes will appear here'}</p><p className="mt-2 text-xs text-[#81766a]">Choose New Note to begin a draft.</p></div>:searched.map(note=><button key={note.id} type="button" onClick={()=>choose(note)} aria-current={selection===note.id?'true':undefined} className={'block w-full rounded-lg border p-3.5 text-left transition '+(selection===note.id?'border-[#af8b58] bg-[#f7efe1]':'border-[#ebe2d6] bg-white hover:border-[#bdab92]')}>
       <div className="flex flex-wrap justify-between gap-2"><Pill note={note}/><span className="text-[10px] text-[#81766a]">{displayDate(note.updated_at??note.created_at)}</span></div>
       <strong className="mt-2 block break-words font-serif text-lg font-normal leading-snug">{titleFor(note)}</strong>
       <p className="mt-1 text-[11px] text-[#81766a]">Revision {note.revision} · {countWords(note.body)} words</p>
       <span className="mt-2 block text-[11px] font-medium text-[#795f3b]">Edit / Review →</span>
      </button>)}
     </div>
    </section>
    <section className={panel+' min-w-0 p-5 md:p-7'}>
     <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e5daca] pb-5">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b7a43]">{selection?'NOTE EDITOR · REVISION '+revision:'NEW DRAFT'}</p><h3 className="mt-1 font-serif text-[26px] leading-tight">{selection?(selected?.title??draft.title):'An unwritten Note'}</h3></div>
      <span className="rounded-md bg-[#f3ede3] px-3 py-1.5 text-xs text-[#756b5e]">{selection?state.toUpperCase():'UNSAVED'}{dirty?' · Unsaved changes':''}</span>
     </div>

     <div role="tablist" aria-label="Draft views" className="mt-6 flex flex-wrap gap-2 border-b border-[#ded1ba]">
      {([['edit','Editor'],['website','Website preview'],['email','Email preview']] as const).map(([key,label],index,tabs)=><button key={key} type="button" role="tab" id={'studio-tab-'+key} aria-controls={'studio-panel-'+key} aria-selected={editorTab===key} tabIndex={editorTab===key?0:-1} onClick={()=>setEditorTab(key)} onKeyDown={event=>{const next=event.key==='ArrowRight'?(index+1)%3:event.key==='ArrowLeft'?(index+2)%3:event.key==='Home'?0:event.key==='End'?2:-1;if(next>=0){event.preventDefault();setEditorTab(tabs[next][0]);document.getElementById('studio-tab-'+tabs[next][0])?.focus();}}} className={'min-h-11 rounded-t border border-b-0 px-4 py-2.5 text-[13px] font-semibold transition '+(editorTab===key?'border-[#17232c] bg-[#17232c] text-[#faf6ee]':'border-[#d5c7ae] bg-[#fffdf8] text-[#606364] hover:bg-[#f0e8da]')}>{label}</button>)}
     </div>
     <section id="studio-panel-edit" role="tabpanel" aria-labelledby="studio-tab-edit" hidden={editorTab!=='edit'} className="pt-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(245px,1fr)]">
       <div className="min-w-0 space-y-5">
        <label className="block text-[13px] font-semibold">Title<input className={field} maxLength={160} value={draft.title} disabled={!editable||busy} onChange={e=>setDraft(v=>({...v,title:e.target.value,slug:(!v.slug||v.slug===slugFromTitle(v.title))?slugFromTitle(e.target.value):v.slug}))}/></label>
        <label className="block text-[13px] font-semibold">Narrator<select className={field} value={draft.narrator} disabled={!editable||busy} onChange={e=>edit('narrator',e.target.value as 'Behzad'|'Steven')}><option value="Behzad">Behzad</option><option value="Steven">Steven</option></select></label>
        <label className="block text-[13px] font-semibold">Exact Note text<p className="mt-2 text-xs font-normal leading-5 text-[#606364]">Your punctuation, spacing and line breaks are kept. No automatic editing or rewriting.</p><textarea className={field+' min-h-[365px] resize-y font-serif text-[19px] font-normal leading-[1.75]'} rows={15} maxLength={15000} spellCheck={false} autoCorrect="off" autoCapitalize="off" value={draft.body} disabled={!editable||busy} onChange={e=>edit('body',e.target.value)}/></label>
        <p className="text-xs text-[#86796a]">{draft.body.length.toLocaleString()} characters · {countWords(draft.body)} words · {dirty?'Unsaved changes':'Saved draft'}</p>
       </div>
       <aside className="min-w-0 border-t border-[#ded1ba] pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
        <h4 className="font-serif text-2xl font-normal">Photograph</h4>
        <p className="mt-2 text-xs leading-5 text-[#606364]">A private saved original. JPEG or PNG, up to 3 MiB and 16 megapixels. Save text and its alt description first; each new photograph creates a preserved revision.</p>
        <div className="mt-4 grid min-h-[185px] place-content-center overflow-hidden border border-dashed border-[#cfc4b0] bg-[#faf6ee] text-center text-sm text-[#606364]">{displayImage?<img className="block max-h-[320px] w-full object-contain" src={displayImage} alt={draft.imageAlt||'Selected photograph'}/>:<span>No photograph selected</span>}</div>
        <label className="mt-5 block text-[13px] font-semibold">Choose photograph
          <input type="file" accept="image/jpeg,image/png" className={field} disabled={!editable||busy||photoReading} onChange={e=>{
           const file=e.currentTarget.files?.[0];e.currentTarget.value='';
           if(file)void selectPhotograph(file);
          }}/>
        </label>
        {photoReading&&<p className="mt-2 text-sm font-medium text-[#305267]" role="status">Checking photograph and preparing preview…</p>}
        {photoProblem&&<p className="mt-2 rounded border border-[#bfa982] bg-[#fff8e8] px-3 py-2 text-sm leading-6 text-[#775125]" role="status">{photoProblem}</p>}
        {pendingPhoto&&<div className="mt-2 rounded border border-[#d9cdbb] bg-[#faf6ee] px-3 py-2 text-xs">
          <p className="font-semibold">Selected photograph: {pendingPhoto.name} · not saved yet</p>
          <p className="mt-1">Click Save private draft to store this image and a new immutable revision.</p>
          <button className="mt-2 text-[#805c35] underline" type="button" disabled={busy} onClick={()=>{photoValidationController.current?.abort();setPendingPhoto(null);setPendingPhotoUrl(undefined);setPendingEmailData(undefined);setPhotoProblem('');}}>Cancel selected photograph</button>
        </div>}
        {!selection&&<p className="mt-2 text-xs text-[#8b6030]">You can choose a photograph now; saving creates the Note first.</p>}
        {displayImage&&<PrivatePhotographFraming image={displayImage} value={draft.framing} onChange={framing=>edit('framing',framing)} disabled={!editable||busy}/>}
        <label className="mt-4 block text-[13px] font-semibold">Photograph alt text<textarea className={field} rows={3} maxLength={250} disabled={!editable||busy} value={draft.imageAlt} onChange={e=>edit('imageAlt',e.target.value)}/></label>
        <p className="mt-1 text-xs leading-5 text-[#606364]">Optional, as in the original Local Studio. Used for accessibility and fallback text.</p>
        <details className="mt-5 border-t border-[#ded1ba] pt-5"><summary className="min-h-11 cursor-pointer text-[13px] font-semibold">Advanced / SEO</summary>
         <div className="mt-3 space-y-4">
          <label className="block text-xs font-semibold">Page URL slug<input className={field} value={draft.slug} disabled={!editable||busy} onChange={e=>edit('slug',e.target.value)} placeholder="my-note-title"/></label>
          <label className="block text-xs font-semibold">Caption (optional)<input className={field} value={draft.imageCaption} maxLength={1000} disabled={!editable||busy} onChange={e=>edit('imageCaption',e.target.value)}/></label>
          <label className="block text-xs font-semibold">Archive excerpt<textarea className={field} rows={3} maxLength={1000} value={draft.excerpt} disabled={!editable||busy} onChange={e=>edit('excerpt',e.target.value)}/></label>
          <label className="block text-xs font-semibold">Search description<textarea className={field} rows={3} maxLength={500} value={draft.seoDescription} disabled={!editable||busy} onChange={e=>edit('seoDescription',e.target.value)}/></label>
         </div>
        </details>
       </aside>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[#ded1ba] pt-5">
       <button type="button" className={primary} disabled={!editable||busy} onClick={()=>run(async()=>{
        if(photoReading)throw Error('Photograph check is still in progress.');
        // Prepare the online copy before saving text, minimizing partial saves.
        const prepared=pendingPhoto?await prepareLocalPhotoUpload(pendingPhoto):null;
        const result=await action({action:'save',id:selection,revision,draft});
        if(prepared){
         const form=new FormData();
         form.set('photograph',prepared.file);form.set('noteId',result.note.id);form.set('revision',String(result.note.revision));form.set('alt',draft.imageAlt);
         const response=await fetch('/api/admin/notes-studio/photo',{method:'POST',body:form,credentials:'same-origin',cache:'no-store'});
         const upload=await response.json();
         if(!response.ok){incorporate(result.note);throw Error((upload.error||'Photograph upload failed.')+' The Note text was saved, but the photo was not. Select the photograph again.');}
         incorporate(upload.note);setPendingPhoto(null);setPendingPhotoUrl(undefined);setPendingEmailData(undefined);setPhotoProblem('');
         setMessage(prepared.optimized?'Private Note saved with an optimized JPEG copy; the original file on your computer is unchanged. Nothing published or sent.':'Note and photograph saved privately. Nothing published or sent.');
        }else{
         incorporate(result.note);setMessage('Private revision saved. No publication or email sent.');
        }
       })}>{busy?'Saving…':'Save private draft'}</button>
       {selection&&savedTime(selected?.updated_at)&&<p className="min-w-0 flex-1 text-xs leading-5 text-[#675a48]" aria-live="polite"><time className="font-semibold text-[#203347]" dateTime={selected?.updated_at}>{savedTime(selected?.updated_at)}</time><span className="block text-[#776f63]">Private revision · Nothing published or sent{dirty?' · Unsaved changes remain':''}</span></p>}
      </div>
     </section>
     <section id="studio-panel-website" role="tabpanel" aria-labelledby="studio-tab-website" hidden={editorTab!=='website'} className="pt-6">
      <p className="mb-4 text-xs leading-5 text-[#606364]">Current editor text, including unsaved changes. Private preview only.</p>
      <StudioReadingPreview draft={draft} image={displayImage}/>
     </section>
     <section id="studio-panel-email" role="tabpanel" aria-labelledby="studio-tab-email" hidden={editorTab!=='email'} className="pt-6">
      <p className="mb-4 text-xs leading-5 text-[#606364]">Current editor text, including unsaved changes. No email is sent from this preview.</p>
      <StudioEmailPreview draft={draft} image={pendingEmailData??emailImage}/>
     </section>
     {selection&&<section className="mt-7 border-t border-[#e5daca] pt-5">
       <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h4 className="font-serif text-xl">Revision history</h4><p className="mt-1 text-xs text-[#766c60]">Read-only snapshots of successfully saved drafts. Older saves from before history was enabled cannot be reconstructed.</p></div>
        <button type="button" className={secondary} disabled={busy} onClick={()=>{if(historyOpen){setHistoryOpen(false);}else{void showHistory();}}}>{historyOpen?'Close history':'View saved revisions'}</button>
       </div>
       {historyOpen&&<div className="mt-4 grid gap-4 rounded-lg border border-[#ddd1be] bg-[#faf7f1] p-4 md:grid-cols-[minmax(165px,.65fr)_minmax(0,1.35fr)]">
        <div className="max-h-[340px] space-y-2 overflow-y-auto">
         {history===null?<p className="text-sm">Loading saved revisions…</p>:history.length===0?<p className="text-sm">No revision snapshots yet.</p>:history.map(item=><button type="button" key={item.revision} onClick={()=>setHistorySelected(item.revision)} aria-pressed={historySelected===item.revision} className={'block w-full rounded border p-3 text-left text-xs '+(historySelected===item.revision?'border-[#967849] bg-[#eee2cd]':'border-[#ded1bf] bg-[#fffdf9] hover:bg-[#f1e9da]')}>
          <strong className="block text-sm">Revision {item.revision}</strong><span className="mt-1 block">{savedTime(item.saved_at)??'Saved date unavailable'}</span>
         </button>)}
        </div>
        <div className="min-w-0 border-t border-[#ddd1be] pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
         {history?.find(item=>item.revision===historySelected)?((item)=> <article className="max-h-[400px] overflow-y-auto">
          <p className="text-xs text-[#766c60]">Read-only historical revision · Narrator: {item.narrator}</p>
          <h5 className="mt-2 font-serif text-2xl">{item.title}</h5>
          {item.photo_id&&<img className="mt-3 max-h-[220px] max-w-full object-contain" src={'/api/admin/notes-studio/photo?noteId='+encodeURIComponent(item.note_id)+'&assetId='+encodeURIComponent(item.photo_id)} alt={item.image_alt}/>}
          <div className="mt-4 whitespace-pre-wrap border-t border-[#ddd1be] pt-4 font-serif text-lg leading-[1.7]">{item.body}</div>
          <p className="mt-5 text-xs text-[#766c60]">This snapshot is immutable. To reuse text, copy it manually into the draft editor.</p>
         </article>)(history.find(item=>item.revision===historySelected)!):<p className="text-sm text-[#766c60]">Choose a saved revision to review its original text.</p>}
        </div>
       </div>}
     </section>}
     {selection&&editable&&<details className="mt-7 border-t border-[#e5daca] pt-5"><summary className="cursor-pointer font-serif text-xl">Send a test email</summary>
       <p className="mt-3 text-xs text-[#786e61]">One manually entered recipient. Test delivery requires reviewing the exact address and a second confirmation.</p>
       <label className="mt-4 block text-xs font-semibold">Test recipient<input type="email" className={field} value={testEmail} onChange={e=>{setTestEmail(e.target.value);setTest(null);}} disabled={busy} placeholder="your-test-email@example.com"/></label>
       {!test?<button className={secondary+' mt-3'} disabled={!testEmail||busy||dirty} onClick={()=>run(async()=>{const x=await action({action:'testPrepare',id:selection,recipient:testEmail});setTest(x.test);setMessage('Check the recipient and subject before sending.');})}>Review test</button>:
       <div className="mt-4 rounded-lg border border-[#dac9b2] bg-[#faf4e9] p-4 text-sm"><p>To: <strong>{test.recipient}</strong></p><p className="mt-1">Subject: {test.subject}</p><button className={primary+' mt-4'} disabled={busy} onClick={()=>run(async()=>{const x=await action({action:'testConfirm',testId:test.id,recipient:test.recipient,confirm:true});setMessage('Test attempt: '+x.test.state+'. Check the recipient inbox. Do not retry uncertain attempts.');setTest(null);})}>Confirm one TEST email</button></div>}
      </details>}
     {selection&&editable&&<details className="mt-5 border-t border-[#e5daca] pt-5"><summary className="cursor-pointer font-serif text-xl">Schedule publication</summary>
       <p className="mt-3 text-xs text-[#786e61]">Scheduling locks the saved revision. Current Cron checks once daily at 03:00 UTC, not at the exact minute. Public delivery is {deliveryEnabled?'enabled':'disabled'}.</p>
       <input type="datetime-local" className={field} value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)}/>
       <button className={secondary+' mt-3'} disabled={busy||dirty||!scheduleDate||!deliveryEnabled} onClick={()=>run(async()=>{if(!window.confirm('Lock the Note and schedule publication for all active subscribers?'))return;const x=await action({action:'schedule',id:selection,revision,scheduledAt:new Date(scheduleDate).toISOString(),confirm:true});incorporate(x.note);setMessage('Note scheduled.');})}>Confirm schedule</button>
       {!deliveryEnabled&&<p className="mt-2 text-xs text-[#9a6e35]">Scheduling is temporarily locked while public delivery is disabled. Drafts, previews and individual tests are available.</p>}
      </details>}
     {selection&&state==='scheduled'&&<div className="mt-6 border-t border-[#e5daca] pt-5"><p className="text-sm">Scheduled for {displayDate(selected?.scheduled_at)}</p><button className={secondary+' mt-3'} disabled={busy} onClick={()=>run(async()=>{const x=await action({action:'cancel',id:selection});incorporate(x.note);setMessage('Schedule cancelled.');})}>Cancel schedule</button></div>}
     {selection&&state==='published'&&<div className="mt-6 border-t border-[#e5daca] pt-5"><button className={secondary} disabled={busy} onClick={()=>run(async()=>{const x=await action({action:'pause',id:selection,paused:!paused});incorporate(x.note);setMessage(x.note.paused?'Remaining delivery paused.':'Remaining delivery resumed.');})}>{paused?'Resume remaining delivery':'Pause remaining delivery'}</button></div>}
     <p role="status" aria-live="polite" className="mt-6 text-sm text-[#8b6535]">{message}</p>
    </section>
   </div>}
   {view==='calendar'&&<section className={panel+' p-5 md:p-8'}>
     <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#967743]">PUBLICATION PLAN</p><h3 className="mt-1 font-serif text-3xl">Publication Calendar</h3></div><div className="flex items-center gap-2"><button className={secondary} aria-label="Previous month" onClick={()=>setMonth(v=>new Date(v.getFullYear(),v.getMonth()-1,1))}>‹</button><span className="min-w-[120px] text-center text-sm font-medium">{month.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span><button className={secondary} aria-label="Next month" onClick={()=>setMonth(v=>new Date(v.getFullYear(),v.getMonth()+1,1))}>›</button></div></div>
     <p className="mt-3 text-sm text-[#84766a]">Scheduled and published Notes are shown on their intended New York calendar day. Nothing is mailed from this view.</p>
     <div className="mt-6 grid grid-cols-7 border-l border-t border-[#ded3c3] text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#857a6b]">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="border-b border-r border-[#ded3c3] bg-[#f4eee5] py-3">{d}</div>)}
       {squares.map((day,i)=>{const active=day>0&&day<=daysInMonth;const dayString=active?dateKey(new Date(month.getFullYear(),month.getMonth(),day,12).toISOString()):'';const items=active?notes.filter(n=>{const date=n.state==='published'?n.published_at:n.scheduled_at;return date&&dateKey(date)===dayString;}):[];return <div key={i} className={'min-h-[85px] border-b border-r border-[#ded3c3] p-1.5 text-left md:min-h-[108px] md:p-2 '+(active?'bg-[#fffdf9]':'bg-[#f7f2eb]')}><span className="text-xs font-normal">{active?day:''}</span>{items.map(n=><button key={n.id} onClick={()=>choose(n)} className="mt-1 block w-full truncate rounded bg-[#e9ddcb] px-1.5 py-1 text-left text-[10px] normal-case tracking-normal text-[#203347]" title={n.title}>{n.title}</button>)}</div>;})}
     </div>
     <div className="mt-7"><h4 className="font-serif text-xl">Upcoming Notes</h4>{scheduled.length?<ul className="mt-3 divide-y divide-[#e7ddce]">{scheduled.map(n=><li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="font-serif">{n.title}</span><span className="text-sm text-[#766c60]">{displayDate(n.scheduled_at)}</span><button className={secondary} onClick={()=>choose(n)}>Review</button></li>)}</ul>:<p className="mt-3 rounded-lg border border-dashed border-[#ded3c3] p-6 text-sm text-[#807569]">No Notes have been scheduled yet.</p>}</div>
    </section>}
   {view==='delivery'&&<section className={panel+' p-5 md:p-8'}>
     <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#967743]">PUBLICATION OPERATIONS</p><h3 className="mt-1 font-serif text-3xl">Delivery &amp; Status</h3>
     <p className="mt-3 max-w-2xl text-sm text-[#81766a]">Public delivery is independently controlled. This area shows your Notes' publication states; it does not claim subscriber delivery totals without a verified delivery report.</p>
     <div className="mt-6 grid gap-3 sm:grid-cols-3">{[['Drafts',counts.drafts],['Scheduled',counts.scheduled],['Published',counts.published]].map(([label,count])=><div key={label} className="rounded-lg border border-[#e1d5c3] bg-[#f8f3eb] p-5"><p className="text-xs text-[#84786a]">{label}</p><p className="mt-2 font-serif text-4xl">{count}</p></div>)}</div>
     <div className="mt-6 rounded-lg border border-[#dbc9a8] bg-[#faf3e7] p-5"><strong className="block text-sm">{deliveryEnabled?'Public delivery is enabled':'Public delivery is paused at the system level'}</strong><p className="mt-2 text-sm text-[#756b5d]">This lock protects subscribers while scheduling precision and batch capacity are being reviewed. Welcome and confirmation emails are separate and unaffected.</p></div>
     <h4 className="mt-8 font-serif text-xl">Published Notes</h4>
     {notes.filter(n=>n.state==='published').length?<ul className="mt-3 divide-y divide-[#e7ddce]">{notes.filter(n=>n.state==='published').map(n=><li className="flex flex-wrap justify-between gap-3 py-3" key={n.id}><span>{n.title}</span><Pill note={n}/></li>)}</ul>:<p className="mt-3 text-sm text-[#8a7a6c]">No Notes have been published.</p>}
     <p className="mt-6 text-xs text-[#8a7a6c]">Individual recipient status reporting is not yet available in this interface. No automatic resend is performed for uncertain Gmail results.</p>
    </section>}
   </div>
  </div>
 </div>;
}

'use client';

import {useMemo, useState} from 'react';

type Note={id:string;slug:string;title:string;body:string;image_alt:string;state:'draft'|'scheduled'|'published'|'cancelled';paused:boolean;revision:number;scheduled_at:string|null;published_at:string|null;created_at?:string;updated_at?:string};
type Draft={slug:string;title:string;body:string;imageAlt:string};
type View='notes'|'calendar'|'delivery';
type Preview='website'|'email';
const blank:Draft={slug:'',title:'',body:'',imageAlt:''};
const primary='inline-flex min-h-11 items-center justify-center rounded-md bg-[#172d42] px-5 py-2.5 text-sm font-medium text-[#fffdf8] transition hover:bg-[#29445b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b08a4c] disabled:cursor-not-allowed disabled:opacity-40';
const secondary='inline-flex min-h-11 items-center justify-center rounded-md border border-[#d4c4aa] bg-[#fffdf8] px-4 py-2.5 text-sm font-medium text-[#172d42] transition hover:bg-[#f3ebdf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b08a4c] disabled:cursor-not-allowed disabled:opacity-40';
const field='mt-2 w-full rounded-md border border-[#d9cdbb] bg-[#fffefa] px-4 py-3 text-[15px] text-[#172d42] outline-none transition focus:border-[#9a753b] focus:ring-2 focus:ring-[#b99a68]/20 disabled:bg-[#f3efe7]';
const panel='rounded-xl border border-[#ded3c3] bg-[#fffdf9] shadow-[0_8px_28px_rgba(21,37,50,0.035)]';
const displayDate=(value:string|null|undefined)=>value?new Date(value).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'America/New_York'}):'—';
const dateKey=(value:string)=>new Date(value).toLocaleDateString('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/New_York'});
const titleFor=(note:Note)=>note.title||'Untitled Note';
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
 const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
 const [previewHtml,setPreviewHtml]=useState('');
 const [previewOpen,setPreviewOpen]=useState(false);
 const [scheduleDate,setScheduleDate]=useState('');
 const [testEmail,setTestEmail]=useState('');
 const [test,setTest]=useState<{id:string;recipient:string;subject:string}|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [month,setMonth]=useState(()=>{const today=new Date();return new Date(today.getFullYear(),today.getMonth(),1);});
 const selected=notes.find(n=>n.id===selection);
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 const editable=state==='draft';
 const searched=useMemo(()=>notes.filter(n=>[n.title,n.slug,n.state].join(' ').toLowerCase().includes(search.trim().toLowerCase())),[notes,search]);
 const counts={drafts:notes.filter(n=>n.state==='draft').length,scheduled:notes.filter(n=>n.state==='scheduled').length,published:notes.filter(n=>n.state==='published').length};
 function guardUnsaved(){return !dirty||window.confirm('You have unsaved changes. Leave this draft without saving?');}
 function choose(n:Note){
  if(!guardUnsaved())return;
  const values={title:n.title,slug:n.slug,body:n.body,imageAlt:n.image_alt};
  setSelection(n.id);setDraft(values);setSaved(values);setRevision(n.revision);
  setState(n.state);setPaused(n.paused);setPreviewOpen(false);setPreviewHtml('');
  setScheduleDate(n.scheduled_at?new Date(n.scheduled_at).toLocaleString('sv-SE').replace(' ','T').slice(0,16):'');
  setTest(null);setMessage('');setView('notes');
 }
 function fresh(){
  if(!guardUnsaved())return;
  setSelection(null);setDraft(blank);setSaved(blank);setRevision(null);setState('draft');setPaused(false);
  setPreviewOpen(false);setPreviewHtml('');setTest(null);setMessage('');setView('notes');
 }
 function incorporate(n:Note){
  setNotes(prev=>[n,...prev.filter(x=>x.id!==n.id)]);
  const values={title:n.title,slug:n.slug,body:n.body,imageAlt:n.image_alt};
  setSelection(n.id);setDraft(values);setSaved(values);setRevision(n.revision);setState(n.state);setPaused(n.paused);
  setTest(null);
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
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9b7a43]">{selection?'NOTE EDITOR · REVISION '+revision:'NEW DRAFT'}</p><h3 className="mt-1 font-serif text-[26px] leading-tight">{selection?titleFor(selected??{...blank,id:'',image_alt:'',state:'draft',paused:false,revision:0,scheduled_at:null,published_at:null} as Note):'An unwritten Note'}</h3></div>
      <span className="rounded-md bg-[#f3ede3] px-3 py-1.5 text-xs text-[#756b5e]">{selection?state.toUpperCase():'UNSAVED'}{dirty?' · Unsaved changes':''}</span>
     </div>
     <div className="mt-5 grid gap-5">
      <label className="block text-xs font-semibold tracking-[0.02em]">Title<input className={field} maxLength={160} value={draft.title} disabled={!editable||busy} onChange={e=>edit('title',e.target.value)} placeholder="Give this Note a title"/></label>
      <label className="block text-xs font-semibold tracking-[0.02em]">The Note<textarea className={field+' min-h-[290px] resize-y font-serif text-[18px] font-normal leading-[1.75] md:min-h-[370px]'} rows={11} maxLength={15000} value={draft.body} disabled={!editable||busy} onChange={e=>edit('body',e.target.value)} placeholder="Write in your own voice. Paragraph breaks are kept exactly as written."/></label>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#86796a]"><span>{countWords(draft.body)} words · {draft.body.length.toLocaleString()} characters</span><span>{dirty?'Not yet saved':'Saved version'}</span></div>
      <details className="rounded-lg border border-[#e3d8c8] bg-[#fcf9f3] px-4 py-3"><summary className="cursor-pointer text-sm font-medium">Advanced / URL &amp; SEO</summary>
       <div className="mt-4 space-y-4"><label className="block text-xs font-semibold">Page URL slug<input className={field} value={draft.slug} disabled={!editable||busy} onChange={e=>edit('slug',e.target.value)} placeholder="my-note-title"/></label>
       <p className="text-xs text-[#7e7469]">Use lowercase letters, numbers and hyphens. This becomes part of the public reading link after publication.</p>
       <label className="block text-xs font-semibold">Photo description (for future image integration)<input className={field} maxLength={250} value={draft.imageAlt} disabled={!editable||busy} onChange={e=>edit('imageAlt',e.target.value)}/></label>
       <p className="text-xs text-[#7e7469]">Photo upload is not yet available in this restored interface. Existing imagery is not changed.</p></div>
      </details>
      <div className="flex flex-wrap gap-2 border-t border-[#e5daca] pt-5">
       <button type="button" className={primary} disabled={!editable||busy} onClick={()=>run(async()=>{const x=await action({action:'save',id:selection,revision,draft});incorporate(x.note);setMessage('Draft saved with original text unchanged.');})}>Save draft</button>
       <button type="button" className={secondary} disabled={!selection||busy} onClick={()=>run(async()=>{if(dirty){setMessage('Save your changes before previewing.');return;}const x=await action({action:'preview',id:selection});setPreviewHtml(x.html);setPreviewOpen(true);setPreviewMode('email');setMessage('Showing the saved email revision.');})}>Email Preview</button>
       <button type="button" className={secondary} disabled={!selection||busy} onClick={()=>{if(dirty){setMessage('Save your changes before previewing.');return;}setPreviewOpen(true);setPreviewMode('website');setMessage('Showing the saved reading preview.');}}>Website Preview</button>
      </div>
     </div>
     {previewOpen&&selection&&<div className="mt-7 rounded-lg border border-[#d9c9b1] bg-[#f5f0e7] p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
       <div className="flex gap-2"><button type="button" className={previewMode==='website'?primary:secondary} onClick={()=>setPreviewMode('website')}>Website</button><button type="button" className={previewMode==='email'?primary:secondary} onClick={()=>{setPreviewMode('email');if(!previewHtml)run(async()=>{const x=await action({action:'preview',id:selection});setPreviewHtml(x.html);});}}>Email</button></div>
       <div className="flex gap-2 text-xs"><button className="underline underline-offset-4" onClick={()=>setDevice('desktop')}>Desktop</button><button className="underline underline-offset-4" onClick={()=>setDevice('mobile')}>Mobile</button><button className="ml-2 underline underline-offset-4" onClick={()=>setPreviewOpen(false)}>Close</button></div>
      </div>
      <div className={'mx-auto mt-4 overflow-hidden rounded-lg border border-[#d9cfc1] bg-[#fffdf8] transition-all '+(device==='mobile'?'max-w-[390px]':'w-full')}>
       {previewMode==='email'?previewHtml?<iframe title="Private saved email preview" sandbox="" srcDoc={previewHtml} className="h-[570px] w-full"/>:<div className="p-8 text-sm">Preparing the email preview…</div>:
       <article className="mx-auto max-w-[710px] px-6 py-10 md:px-9">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#9c8155]">A NOTE FROM BEHZAD</p>
        <h4 className="mt-3 font-serif text-3xl font-normal leading-tight md:text-[42px]">{selected.title}</h4>
        <div className="mt-6 border-t border-[#d9cbb7] pt-7">{selected.body.split(/\r?\n\s*\r?\n/).map((paragraph,i)=><p key={i} className="mb-5 whitespace-pre-wrap font-serif text-[18px] leading-[1.75]">{paragraph}</p>)}</div>
       </article>}
      </div>
      <p className="mt-3 text-[11px] text-[#817669]">Private preview only. This is not a publication or a real recipient email.</p>
     </div>}
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

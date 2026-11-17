'use client';
import {useState} from 'react';
type Note={id:string;slug:string;title:string;body:string;image_alt:string;state:string;paused:boolean;revision:number;scheduled_at:string|null;published_at:string|null};
type Draft={slug:string;title:string;body:string;imageAlt:string};
const empty:Draft={slug:'',title:'',body:'',imageAlt:''};
async function action(payload:Record<string,unknown>){
 const res=await fetch('/api/admin/notes-studio',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const value=await res.json();
 if(!res.ok)throw new Error(value.error??'Operation failed.');
 return value;
}
const btn='min-h-11 rounded border border-[#b49a68] px-4 py-2 text-sm hover:bg-[#f2e8d8] disabled:opacity-40';
const input='w-full rounded border border-line bg-white px-3 py-3 text-base';
export function NotesStudioEditor({initialNotes,deliveryEnabled}:{initialNotes:Note[];deliveryEnabled:boolean}){
 const [notes,setNotes]=useState(initialNotes);
 const [id,setId]=useState<string|null>(null);
 const [revision,setRevision]=useState<number|null>(null);
 const [state,setState]=useState('draft');
 const [paused,setPaused]=useState(false);
 const [draft,setDraft]=useState<Draft>(empty);
 const [preview,setPreview]=useState('');
 const [scheduledAt,setScheduledAt]=useState('');
 const [recipient,setRecipient]=useState('');
 const [test,setTest]=useState<{id:string;recipient:string;subject:string}|null>(null);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 function select(note:Note){
  setId(note.id);setRevision(note.revision);setState(note.state);setPaused(note.paused);
  setDraft({slug:note.slug,title:note.title,body:note.body,imageAlt:note.image_alt});
  setPreview('');setTest(null);setMessage('');setScheduledAt(note.scheduled_at?note.scheduled_at.slice(0,16):'');
 }
 function update(note:Note){setNotes(all=>[note,...all.filter(n=>n.id!==note.id)]);select(note);}
 async function run(op:()=>Promise<void>){
  if(busy)return;setBusy(true);setMessage('');
  try{await op();}catch(error){setMessage(error instanceof Error?error.message:'Operation unavailable.');}
  finally{setBusy(false);}
 }
 const hasId=Boolean(id),editable=state==='draft';
 return <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
  <aside className="rounded border border-line bg-[#fffdf8] p-4">
   <h2 className="font-serif text-xl">Saved Notes</h2>
   <button className={btn+' mt-4 w-full'} onClick={()=>{setId(null);setRevision(null);setDraft(empty);setState('draft');setPaused(false);setPreview('');setTest(null);setMessage('');}}>New draft</button>
   <ul className="mt-4 space-y-2">{notes.map(note=><li key={note.id}><button type="button" onClick={()=>select(note)} className="w-full rounded border border-line p-3 text-left text-sm hover:bg-[#f2e8d8]"><strong className="block break-words">{note.title}</strong><span className="text-xs text-muted">{note.state}{note.paused?' · paused':''} · revision {note.revision}</span></button></li>)}</ul>
  </aside>
  <section className="min-w-0">
   <h2 className="font-serif text-2xl">Editorial workspace</h2>
   <p className="mt-2 text-sm text-muted">Draft text is saved exactly as typed. Scheduling locks the revision; no automatic rewriting. No Note is sent by opening this page.</p>
   <div className="mt-5 space-y-4">
    <label className="block text-sm font-semibold">Title<input className={input+' mt-2'} maxLength={160} value={draft.title} disabled={!editable||busy} onChange={e=>setDraft(v=>({...v,title:e.target.value}))}/></label>
    <label className="block text-sm font-semibold">URL slug<input className={input+' mt-2'} placeholder="a-small-memory" value={draft.slug} disabled={!editable||busy} onChange={e=>setDraft(v=>({...v,slug:e.target.value}))}/></label>
    <label className="block text-sm font-semibold">Authentic Note text<textarea rows={12} maxLength={15000} className={input+' mt-2 font-serif leading-7'} value={draft.body} disabled={!editable||busy} onChange={e=>setDraft(v=>({...v,body:e.target.value}))}/></label>
    <label className="block text-sm font-semibold">Image description (reserved for later photo integration)<input maxLength={250} className={input+' mt-2'} value={draft.imageAlt} disabled={!editable||busy} onChange={e=>setDraft(v=>({...v,imageAlt:e.target.value}))}/></label>
   </div>
   <div className="mt-5 flex flex-wrap gap-3">
    <button className={btn} disabled={!editable||busy} onClick={()=>run(async()=>{const x=await action({action:'save',id,revision,draft});update(x.note);setMessage('Draft saved.');})}>Save draft</button>
    <button className={btn} disabled={!hasId||busy} onClick={()=>run(async()=>{const x=await action({action:'preview',id});setPreview(x.html);setMessage('Preview loaded from the saved Note.');})}>Preview saved version</button>
   </div>
   {preview&&<div className="mt-6"><h3 className="mb-3 font-serif text-xl">Email preview</h3><iframe title="Saved Note preview" sandbox="" srcDoc={preview} className="h-[650px] w-full rounded border border-line"/></div>}
   {hasId&&editable&&<section className="mt-8 border-t border-line pt-6"><h3 className="font-serif text-xl">Test one recipient</h3><p className="mt-2 text-sm text-muted">A test does not enroll subscribers. Prepare and review the exact destination first.</p>
    <input type="email" className={input+' mt-3'} placeholder="one-test-address@example.com" value={recipient} disabled={busy} onChange={e=>{setRecipient(e.target.value);setTest(null);}}/>
    {!test?<button className={btn+' mt-3'} disabled={!recipient||busy} onClick={()=>run(async()=>{const x=await action({action:'testPrepare',id,recipient});setTest(x.test);setMessage('Review destination below before sending.');})}>Prepare test</button>:<div className="mt-4 rounded border border-line p-4 text-sm"><p><strong>Recipient:</strong> {test.recipient}</p><p className="mt-2"><strong>Subject:</strong> {test.subject}</p><button className={btn+' mt-4'} disabled={busy} onClick={()=>run(async()=>{const x=await action({action:'testConfirm',testId:test.id,recipient:test.recipient,confirm:true});setMessage('Test attempt: '+x.test.state+'. Gmail acceptance is not inbox delivery. Never repeat an uncertain attempt.');setTest(null);})}>Confirm and send exactly one TEST</button></div>}
   </section>}
   {hasId&&editable&&<section className="mt-8 border-t border-line pt-6"><h3 className="font-serif text-xl">Schedule publication</h3><p className="mt-2 text-sm text-muted">Enter time in your browser's local timezone. Publication is checked by a DAILY scheduler at 03:00 UTC, not at the exact minute selected. Delivery runs in small batches and may take additional days. The revision is locked after scheduling.</p>
    <input type="datetime-local" className={input+' mt-3'} value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/>
    <button className={btn+' mt-3'} disabled={!scheduledAt||busy} onClick={()=>run(async()=>{if(!window.confirm('Lock this Note and schedule delivery to all active subscribers?'))return;const x=await action({action:'schedule',id,revision,scheduledAt:new Date(scheduledAt).toISOString(),confirm:true});update(x.note);setMessage('Publication scheduled. No message sent yet.');})}>Confirm schedule</button>
   </section>}
   {hasId&&state==='scheduled'&&<section className="mt-8 border-t border-line pt-6"><p className="text-sm">Scheduled: {notes.find(n=>n.id===id)?.scheduled_at??'not available'}</p><button className={btn+' mt-3'} disabled={busy} onClick={()=>run(async()=>{const x=await action({action:'cancel',id});update(x.note);setMessage('Scheduled publication cancelled.');})}>Cancel schedule</button></section>}
   {hasId&&state==='published'&&<section className="mt-8 border-t border-line pt-6"><p className="text-sm">Delivery: {paused?'Paused':'Active'}</p><button className={btn+' mt-3'} disabled={busy} onClick={()=>run(async()=>{const x=await action({action:'pause',id,paused:!paused});update(x.note);setMessage('Delivery '+(x.note.paused?'paused.':'resumed.'));})}>{paused?'Resume deliveries':'Pause remaining deliveries'}</button></section>}
   <section className="mt-8 border-t border-line pt-6"><h3 className="font-serif text-xl">Controlled delivery</h3>
    <p className="mt-2 text-sm text-muted">Public sending is {deliveryEnabled?'enabled':'disabled until a separate deployment approval'}. Process due publications and at most two queued recipient messages. Use only after checking that the correct Notes are scheduled. A Gmail timeout is marked Needs Review, never automatically resent.</p>
    <button className={btn+' mt-3'} disabled={busy||!deliveryEnabled} onClick={()=>run(async()=>{if(!window.confirm('Process due Notes and send up to two real subscriber emails now?'))return;const x=await action({action:'dispatch',confirm:true});setMessage('Published: '+x.published+'. Delivery: '+JSON.stringify(x.delivery)+'. Refresh to see changed statuses.');})}>Confirm: process next batch</button>
   </section>
   <p role="status" className="mt-6 whitespace-pre-wrap text-sm text-[#604b2e]">{message}</p>
  </section>
 </div>;
}

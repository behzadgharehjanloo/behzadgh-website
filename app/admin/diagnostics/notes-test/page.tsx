import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {adminNotesTestEnabled,adminNotesTests} from '@/lib/admin-notes-test';
import {adminTestSnapshot} from '@/lib/admin-notes-test-snapshot';
import {AdminNotesTestEmail,AdminNotesTestStatus} from '@/components/AdminNotesTestEmail';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Admin Notes test email',robots:{index:false,follow:false}};
export default async function NotesTestPage(){
 let authenticated=false;try{authenticated=await isAdminAuthenticatedReadOnly();}catch{return <p>Admin authentication unavailable.</p>;}
 if(!authenticated)redirect('/admin/login');
 const enabled=adminNotesTestEnabled(),snapshot=adminTestSnapshot();let history:Awaited<ReturnType<ReturnType<typeof adminNotesTests>['history']>>=[],unavailable=false;
 if(enabled)try{history=await adminNotesTests().history();}catch{unavailable=true;}
 return <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8"><Link href="/admin/diagnostics" className="text-sm font-semibold underline underline-offset-4">← Diagnostics</Link><h1 className="mt-6 font-serif text-4xl">One Notes test email</h1>
 {unavailable&&<p className="mt-4">Test audit storage is unavailable. Sending is disabled here until it is ready.</p>}
 <AdminNotesTestEmail enabled={enabled&&!unavailable}/>
 <details className="mt-8"><summary className="cursor-pointer font-semibold underline underline-offset-4">Review the synthetic letter</summary><iframe title="Synthetic Notes test email preview" sandbox="" srcDoc={snapshot.preview} className="mt-4 h-[750px] w-full border border-line"/></details>
 <h2 className="mt-8 font-serif text-2xl">Separate test-send history</h2><p className="mt-2 text-sm text-muted">Private Admin audit only. API acceptance does not establish inbox delivery. An interrupted or uncertain attempt must not be repeated automatically.</p>
 <ul className="mt-4 space-y-4">{history.map(row=><li key={row.id} className="break-words border-t border-line pt-3 text-sm"><p>{row.recipient} · {row.state}</p><p className="text-xs text-muted">{row.createdAt} · Attempt {row.id}{row.gmailMessageId?` · Gmail ${row.gmailMessageId}`:''}</p><AdminNotesTestStatus attemptId={row.id}/></li>)}</ul>
 </section>;
}

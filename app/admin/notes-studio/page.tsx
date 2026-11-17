import type {Metadata} from 'next';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {studioEnabled,publicDeliveryEnabled,listStudioNotes} from '@/lib/notes-studio';
import {NotesStudioEditor} from '@/components/admin/NotesStudioEditor';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Notes Studio · Admin',robots:{index:false,follow:false}};
export default async function NotesStudioPage(){
 if(!await isAdminAuthenticatedReadOnly())redirect('/admin/login');
 const enabled=studioEnabled();
 let notes:Awaited<ReturnType<typeof listStudioNotes>>=[];
 let error='';
 if(enabled)try{notes=await listStudioNotes();}catch{error='The Notes Studio database migration has not been verified.';}
 return <main className="mx-auto w-full max-w-[1540px] px-4 pb-16 pt-7 sm:px-8">
 <Link href="/admin" className="text-sm font-semibold underline underline-offset-4">← Admin dashboard</Link>
 <div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#967743]">THE EDITORIAL DESK</p><h1 className="mt-1 font-serif text-4xl text-[#172d42] sm:text-5xl">Notes Studio</h1><p className="mt-2 text-sm text-[#766c60]">Drafts, private previews and the publication calendar, together in one place.</p></div>
 {!enabled?<div className="mt-6 rounded border border-line p-6"><p>Notes Studio has been implemented but is not yet activated in Production.</p><p className="mt-3 text-sm text-muted">Apply the dedicated reviewed migration, then enable NOTES_STUDIO_ENABLED=1 in Production and redeploy. Welcome and existing subscribers remain independent.</p></div>:
 error?<p role="alert" className="mt-6">{error}</p>:
 <NotesStudioEditor initialNotes={notes} deliveryEnabled={publicDeliveryEnabled()}/>}
 </main>;
}

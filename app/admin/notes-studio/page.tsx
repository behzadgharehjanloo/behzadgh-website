import type {Metadata} from 'next';
import './studio-theme.css';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {studioEnabled,publicDeliveryEnabled,listStudioNotes} from '@/lib/notes-studio';
import {cloudEnabled} from '@/lib/notes-cloud-s3';
import {NotesStudioEditor} from '@/components/admin/NotesStudioEditor';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Notes Studio · Admin',robots:{index:false,follow:false}};
export default async function NotesStudioPage(){
 if(!await isAdminAuthenticatedReadOnly())redirect('/admin/login');
 const enabled=studioEnabled();
 let notes:Awaited<ReturnType<typeof listStudioNotes>>=[];
 let error='';
 if(enabled)try{notes=await listStudioNotes();}catch{error='The Notes Studio database migration has not been verified.';}
 return <main className="notes-studio-shell mx-auto w-full max-w-[1750px] px-3 pb-16 pt-5 sm:px-5">
 {!enabled?<div className="mt-6 rounded border border-line p-6"><p>Notes Studio has been implemented but is not yet activated in Production.</p><p className="mt-3 text-sm text-muted">Apply the dedicated reviewed migration, then enable NOTES_STUDIO_ENABLED=1 in Production and redeploy. Welcome and existing subscribers remain independent.</p></div>:
 error?<p role="alert" className="mt-6">{error}</p>:
 <><section className="notes-studio-hero" aria-label="Private editorial workspace"><div><div className="notes-studio-kicker"><span>Admin</span><span aria-hidden="true">/</span><span>Editorial desk</span></div><h1 className="mt-2">Notes Studio</h1><p className="notes-studio-intro mt-2">Write, preview, and prepare each note with care.</p></div><div className="notes-studio-names"><span aria-hidden="true">✦</span><span>Behzad Gharehjanloo · Steven Jones</span><span className="sr-only">Private workspace only</span></div></section><NotesStudioEditor initialNotes={notes} deliveryEnabled={publicDeliveryEnabled()} cloudPhotosEnabled={cloudEnabled()}/></>}
 </main>;
}

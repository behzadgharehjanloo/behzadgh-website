import 'server-only';
import {query} from './database';
import {studioEnabled} from './notes-studio';
export type PublicNote={slug:string;title:string;body:string;published_at:string};
export async function publishedStudioNotes(){
 if(!studioEnabled())return [] as PublicNote[];
 return query<PublicNote>(`SELECT slug,title,body,published_at::text FROM studio_notes
 WHERE state='published' ORDER BY published_at DESC LIMIT 100`);
}
export async function publishedStudioNote(slug:string){
 if(!studioEnabled()||!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))return null;
 return (await query<PublicNote>(`SELECT slug,title,body,published_at::text FROM studio_notes
 WHERE state='published' AND slug=$1`,[slug]))[0]??null;
}

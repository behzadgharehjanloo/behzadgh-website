import type {ReactNode} from 'react';
type Draft={title:string;body:string;imageAlt:string;narrator:'Behzad'|'Steven';imageCaption:string};
function Paragraphs({body}:{body:string}):ReactNode{
 return body.replace(/\r\n?/g,'\n').split(/\n\s*\n/).map((paragraph,i)=><p key={i} className="mb-6 whitespace-pre-wrap font-serif text-[19px] leading-[1.8] text-[#17232c]">{paragraph}</p>);
}
export function StudioReadingPreview({draft,image}:{draft:Draft;image?:string}){
 return <article className="mx-auto max-w-[1100px] bg-[#faf6ee] px-4 py-8 text-[#17232c] sm:px-8">
  <nav aria-label="Draft preview navigation" className="flex flex-wrap justify-between gap-3 border-b border-[#d9ccba] pb-4 text-xs text-[#8a8072]"><span>Previous Note</span><span>Private draft preview</span><span>Next Note</span></nav>
  <p className="mt-10 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9b8157]">{draft.narrator}'s Note · Draft</p>
  <h2 className="mt-3 font-serif text-4xl font-normal leading-tight sm:text-5xl">{draft.title||'Untitled Note'}</h2>
  <div className="mt-9 grid items-start gap-8 border-t border-[#d9ccba] pt-8 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.78fr)]">
   <div className="min-w-0"><Paragraphs body={draft.body}/></div>
   <figure className="min-w-0">{image?<img src={image} className="block w-full object-contain" alt={draft.imageAlt}/>:<div className="grid min-h-[310px] place-content-center border border-dashed border-[#cfc4b0] p-6 text-center text-sm text-[#606364]">Photograph not added</div>}{draft.imageCaption&&<figcaption className="mt-3 text-xs text-[#756e64]">{draft.imageCaption}</figcaption>}</figure>
  </div>
  <nav className="mt-12 border-t border-[#d9ccba] pt-4 text-xs text-[#86796a]">Draft only · Not published</nav>
 </article>;
}

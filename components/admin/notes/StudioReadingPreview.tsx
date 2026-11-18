import './original-window-journey.css';

type Draft={title:string;body:string;imageAlt:string;narrator:'Behzad'|'Steven';imageCaption:string};

// The original Local NoteReading/StudioReadingPreview markup, adapted only to
// the existing Production Draft property names. Never rewrites the user's text.
export function StudioReadingPreview({draft,image}:{draft:Draft;image?:string}){
 const navigation=<nav className="wj-reading-nav wj-reading-nav-top" aria-label="Draft preview navigation"><span>Previous Note</span><span>Private draft preview</span><span>Next Note</span></nav>;
 return <div className="studio-window-journey bg-[#faf6ee]">
  <article className="wj-reading">
   {navigation}
   <div className="wj-reading-layout">
    <div className="wj-reading-text">
     <p className="wj-position">Private draft · Reading preview</p>
     <h1>{draft.title||'Untitled Note'}</h1>
     <p className="wj-date">Narrated by {draft.narrator}</p>
     <div className="wj-story"><div style={{whiteSpace:'pre-wrap'}}>{draft.body}</div></div>
    </div>
    <figure className="wj-reading-photo">
     {image?<img className="wj-photo wj-memory-photo" src={image} alt={draft.imageAlt}/>:<div className="grid min-h-[280px] place-content-center border border-dashed border-[#cfc4b0] p-5 text-center text-sm text-[#606364]">Photograph not added</div>}
     {draft.imageCaption&&<figcaption>{draft.imageCaption}</figcaption>}
    </figure>
   </div>
   <nav className="wj-reading-nav wj-reading-nav-bottom"><span>Draft only · Not published</span></nav>
  </article>
 </div>;
}

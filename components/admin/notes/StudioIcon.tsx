import type {SVGProps} from 'react';

type Name='note'|'notes'|'calendar'|'mail'|'image'|'sliders'|'monitor'|'pen'|'plus'|'search'|'chevron'|'settings'|'upload'|'save'|'clock'|'chart'|'home'|'lock'|'type'|'check'|'camera';
export function StudioIcon({name,className='',...props}:SVGProps<SVGSVGElement>&{name:Name}){
 const paths:Record<Name,React.ReactNode>={
  note:<><path d="M5 3h9l5 5v13H5z"/><path d="M14 3v6h5M8 13h8M8 17h6"/></>,
  notes:<><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 2v6M16 2v6M4 11h16"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5M17 3v5M3 11h18M8 15h4"/></>,
  mail:<><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>,
  image:<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.4"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
  sliders:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor" stroke="#fffdf8"/><circle cx="15" cy="12" r="2" fill="currentColor" stroke="#fffdf8"/><circle cx="11" cy="18" r="2" fill="currentColor" stroke="#fffdf8"/></>,
  monitor:<><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/></>,
  pen:<><path d="m4 20 4-.9L20 7a2 2 0 0 0-3-3L5 16zM15 6l3 3"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  chevron:<path d="m6 9 6 6 6-6"/>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="m10 2-.5 3-2 1-3-1-2 4 2 2v2l-2 2 2 4 3-1 2 1 .5 3h4l.5-3 2-1 3 1 2-4-2-2v-2l2-2-2-4-3 1-2-1-.5-3z"/></>,
  upload:<><path d="M12 16V3M7 8l5-5 5 5M4 15v6h16v-6"/></>,
  save:<><path d="M4 3h14l3 3v15H3V3zM7 3v7h10V3M7 21v-8h10v8"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  chart:<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17v-4M12 17V7M17 17v-7"/></>,
  home:<><path d="m3 11 9-8 9 8v10H3zM9 21v-7h6v7"/></>,
  lock:<><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  type:<><path d="M3 6h18M12 6v13M8 19h8"/></>,
  check:<path d="m4 12 5 5L20 6"/>,
  camera:<><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></>
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={'inline-block h-[17px] w-[17px] shrink-0 '+className} {...props}>{paths[name]}</svg>;
}

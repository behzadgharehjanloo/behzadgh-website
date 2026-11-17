// Pure photograph framing contract ported from the original isolated Local Studio.
// This file has no server, storage, SQL or email side effects.
export type Frame={ratio:'original'|'portrait'|'landscape'|'square';zoom:number;x:number;y:number};
export type Framing={version:1;default:Frame;archive?:Frame;reading?:Frame;email?:Frame};
export const originalFrame:Frame={ratio:'original',zoom:1,x:0.5,y:0.5};
export const originalFraming:Framing={version:1,default:originalFrame};
export function validateFraming(value:unknown):Framing{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid photograph framing.');
 const v=value as Record<string,unknown>;
 if(v.version!==1||Object.keys(v).some(k=>!['version','default','archive','reading','email'].includes(k)))throw Error('Invalid photograph framing.');
 function frame(raw:unknown):Frame{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid photograph framing.');
  const f=raw as Frame;
  if(Object.keys(f).some(k=>!['ratio','zoom','x','y'].includes(k))||!['original','portrait','landscape','square'].includes(f.ratio)
  ||![f.zoom,f.x,f.y].every(n=>typeof n==='number'&&Number.isFinite(n))
  ||f.zoom<1||f.zoom>3||f.x<0||f.x>1||f.y<0||f.y>1)throw Error('Invalid photograph framing.');
  return {ratio:f.ratio,zoom:f.zoom,x:f.x,y:f.y};
 }
 const result:Framing={version:1,default:frame(v.default)};
 for(const key of ['archive','reading','email'] as const)if(v[key]!==undefined)result[key]=frame(v[key]);
 return result;
}
export function cropRectangle(width:number,height:number,frame:Frame){
 if(frame.ratio==='original'&&frame.zoom===1)return{left:0,top:0,width,height};
 const ratio=frame.ratio==='portrait'?3/4:frame.ratio==='landscape'?3/2:frame.ratio==='square'?1:width/height;
 const cropWidth=Math.max(1,Math.min(width,Math.floor(Math.min(width,height*ratio)/frame.zoom)));
 const cropHeight=Math.max(1,Math.min(height,Math.round(cropWidth/ratio)));
 return {left:Math.round((width-cropWidth)*frame.x),top:Math.round((height-cropHeight)*frame.y),width:cropWidth,height:cropHeight};
}
export function frameFor(framing:Framing,context:'archive'|'reading'|'email'|'default'):Frame{
 return context==='default'?framing.default:framing[context]??framing.default;
}
export function previewDimensions(stored:{width:number;height:number}|undefined,natural:{width:number;height:number},originalFile=false){
 if(!stored||originalFile)return natural;
 const actual=natural.width/natural.height,expected=stored.width/stored.height;
 if(Math.abs(actual-expected)>.002&&Math.abs(actual-1/expected)<.002)return{width:stored.height,height:stored.width};
 return stored;
}

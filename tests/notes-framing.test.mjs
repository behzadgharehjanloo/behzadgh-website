import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProject} from './helpers/load-project.mjs';
const framing=loadProject('lib/notes-framing.ts');

test('original local photo framing defaults to unchanged full image',()=>{
 const value=framing.validateFraming(framing.originalFraming);
 assert.deepEqual(JSON.parse(JSON.stringify(framing.cropRectangle(1200,800,value.default))),{left:0,top:0,width:1200,height:800});
});
test('local image frames honor crop ratios, zoom and per-view overrides',()=>{
 const obj=framing.validateFraming({version:1,default:{ratio:'original',zoom:1,x:.5,y:.5},
   email:{ratio:'square',zoom:1,x:.5,y:.5},reading:{ratio:'portrait',zoom:1.5,x:.4,y:.2}});
 assert.equal(framing.frameFor(obj,'archive').ratio,'original');
 assert.equal(framing.frameFor(obj,'email').ratio,'square');
 const square=framing.cropRectangle(1200,800,framing.frameFor(obj,'email'));
 assert.deepEqual(JSON.parse(JSON.stringify(square)),{left:200,top:0,width:800,height:800});
 const portrait=framing.cropRectangle(1200,800,framing.frameFor(obj,'reading'));
 assert.ok(portrait.width<1200 && portrait.height<=800);
});
test('bad object keys, out-of-range zoom, invalid ratio and coordinates are rejected',()=>{
 for(const f of [
  {version:2,default:framing.originalFrame},
  {version:1,default:{ratio:'square',zoom:0,x:.5,y:.5}},
  {version:1,default:{ratio:'square',zoom:4,x:.5,y:.5}},
  {version:1,default:{ratio:'hexagon',zoom:1,x:.5,y:.5}},
  {version:1,default:{...framing.originalFrame,x:-.1}},
  {version:1,default:framing.originalFrame,unsafe:true}
 ])assert.throws(()=>framing.validateFraming(f));
});
test('saved landscape dimensions correct a rotated browser preview',()=>{
 const d=framing.previewDimensions({width:1000,height:600},{width:600,height:1000},false);
 assert.deepEqual(JSON.parse(JSON.stringify(d)),{width:600,height:1000});
});

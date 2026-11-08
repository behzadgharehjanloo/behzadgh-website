import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
const require=createRequire(import.meta.url);
// No real credentials enter module tests. Database calls must be injected.
export function loadProject(file,mocks={},globals={}) {
  const cache=new Map();
  function load(filename) {
    filename=path.resolve(filename);
    if(cache.has(filename))return cache.get(filename).exports;
    const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,allowJs:true}}).outputText;
    const module={exports:{}};cache.set(filename,module);
    vm.runInNewContext(compiled,{module,exports:module.exports,Buffer,URL,URLSearchParams,Request,Response,Headers,File,process:{env:{}},...globals,require(name){
      if(Object.hasOwn(mocks,name))return mocks[name];
      if(name==='server-only')return {};
      if(name==='next/link')return {__esModule:true,default:({children,...props})=>React.createElement('a',props,children)};
      if(name==='next/navigation')return {useRouter:()=>({refresh(){}}),notFound(){throw Error('NOT_FOUND');},redirect(value){throw Error(`REDIRECT:${value}`);}};
      if(name==='next/headers')return {cookies:async()=>({get:()=>undefined})};
      if(name.startsWith('@/')||name.startsWith('./')||name.startsWith('../')){
        const target=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(filename),name);
        const resolved=[target+'.tsx',target+'.ts',target].find(fs.existsSync);
        if(!resolved)throw Error(`Missing module: ${name}`);
        return load(resolved);
      }
      return require(name);
    }},{filename});
    return module.exports;
  }
  return load(file);
}

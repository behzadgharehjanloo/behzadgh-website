import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {loadProject as load} from './helpers/load-project.mjs';
const cell=(dimension,country,region,month,count)=>({dimension,country,region,month,count});
function aggregated(groups){
 const out=new Map();
 for(const g of groups)for(const dimension of ['country','region','month']){
  const country=dimension==='month'?null:g.country;
  const region=dimension==='region'?g.region:null;
  const month=dimension==='month'?g.month:null;
  const key=JSON.stringify([dimension,country,region,month]);
  out.set(key,(out.get(key)??0)+g.count);
 }
 return [...out].map(([key,count])=>cell(...JSON.parse(key),count));
}
function setup({authorized=true,enabled='1',rows=[],failure=false}={}){
 let calls=0;
 return {...load('lib/global-audience-report.ts',{
  '@/lib/auth':{isAdminAuthenticatedReadOnly:async()=>authorized},
  '@/lib/database':{query:async(sql,params)=>{calls++;assert.match(sql,/WITH source AS/);assert.deepEqual(Array.from(params),[]);if(failure)throw Error('SECRET_DATABASE_MESSAGE');return rows;}}
 },{process:{env:{SIGNUP_GEOGRAPHY_REPORT_ENABLED:enabled}}}),calls:()=>calls};
}
for(const enabled of ['', '0','false','true'])test('disabled without exact opt-in: '+enabled,async()=>{
 const s=setup({enabled});assert.equal((await s.loadGlobalAudienceReport()).status,'disabled');assert.equal(s.calls(),0);
});
test('unauthorized request receives no aggregates',async()=>{
 const s=setup({authorized:false});assert.equal((await s.loadGlobalAudienceReport()).status,'unauthorized');assert.equal(s.calls(),0);
});
test('independent dimensions preserve reportable countries, states and months',async()=>{
 const s=setup({rows:aggregated([
 {country:'US',region:'US-NY',month:'2026-01',count:5},
 {country:'US',region:null,month:'2026-01',count:5},
 {country:'CA',region:'CA-ON',month:'2026-02',count:10},
 {country:null,region:null,month:'2026-03',count:5}
 ])});
 const r=await s.loadGlobalAudienceReport();
 assert.equal(r.status,'available');assert.equal(r.total,25);assert.equal(r.known,20);
 assert.equal(r.unknown,5);assert.equal(r.regionsAvailable,true);assert.equal(r.monthsAvailable,true);
 assert.equal(r.countries.find(c=>c.code==='US').regions.find(c=>c.code===null).count,5);
 assert.equal(r.months.reduce((n,m)=>n+m.count,0),25);assert.equal(s.calls(),1);
});
test('small month or region withholds only those dimensions, not the country map',async()=>{
 const s=setup({rows:aggregated([
 {country:'US',region:'US-NY',month:'2026-07',count:5},
 {country:'US',region:'US-CA',month:'2026-08',count:1},
 {country:null,region:null,month:'2026-07',count:6}
 ])});
 const r=await s.loadGlobalAudienceReport();assert.equal(r.status,'available');
 assert.equal(r.total,12);assert.equal(r.regionsAvailable,false);assert.equal(r.monthsAvailable,false);
 assert.equal(r.countries[0].code,'US');assert.deepEqual(r.countries[0].regions,[]);assert.deepEqual(r.months,[]);
});
test('small country group still withholds the entire report',async()=>{
 const r=await setup({rows:aggregated([{country:'US',region:'US-NY',month:'2026-07',count:4},{country:null,region:null,month:'2026-07',count:6}])}).loadGlobalAudienceReport();
 assert.deepEqual(r,{status:'withheld'});
});
test('identifiers are never serialized',async()=>{
 const rows=aggregated([{country:'CA',region:'CA-ON',month:'2026-01',count:5}]).map(x=>({...x,email:'private@example.invalid',id:'SECRET_ID'}));
 const output=JSON.stringify(await setup({rows}).loadGlobalAudienceReport());
 assert.doesNotMatch(output,/private|email|SECRET/);
});
test('database failure returns sanitized unavailable',async()=>assert.deepEqual(await setup({failure:true}).loadGlobalAudienceReport(),{status:'unavailable'}));
test('empty report has no countries',async()=>{const r=await setup().loadGlobalAudienceReport();assert.equal(r.status,'available');assert.equal(r.total,0);assert.equal(r.countries.length,0);});
test('invalid country fails closed',async()=>{const rows=aggregated([{country:'ZZ',region:null,month:'2026-07',count:8}]);assert.equal((await setup({rows}).loadGlobalAudienceReport()).status,'unavailable');});
test('one SQL query, no personal fields or write operations',()=>{
 const s=setup();assert.match(s.audienceAggregateSql,/GROUP BY signup_country/);assert.match(s.audienceAggregateSql,/America\/New_York/);
 assert.doesNotMatch(s.audienceAggregateSql,/INSERT|UPDATE|DELETE|email|preferred_name|ip_address/i);
});
test('unauthorized and withheld do not render private controls',async()=>{
 for(const status of ['withheld','disabled','unavailable','unauthorized']){
  let calls=0;
  const Page=load('components/admin/GlobalAudienceSection.tsx',{'@/app/admin/(protected)/audience/audience.css':{},'@/lib/global-audience-report':{loadGlobalAudienceReport:async()=>({status})},'./GlobalAudienceReport':{GlobalAudienceReport:()=>{calls++;return React.createElement('div',null,'LEAK');}}}).GlobalAudienceSection;
  if(status==='unauthorized')await assert.rejects(Page(),/REDIRECT:\/admin\/login/);
  else assert.doesNotMatch(render(await Page()),/LEAK|<svg|<select|<meter/);
  assert.equal(calls,0);
 }
});
test('empty UI has disabled selection',()=>{
 const View=load('components/admin/GlobalAudienceReport.tsx',{'@/lib/analytics-world-paths.json':{paths:[{name:'Canada',path:'M0 0'}]}}).GlobalAudienceReport;
 const html=render(React.createElement(View,{report:{status:'available',total:0,known:0,unknown:0,countries:[],months:[],regionsAvailable:true,monthsAvailable:true}}));
 assert.match(html,/select[^>]*disabled/);assert.doesNotMatch(html,/#b18b45|NaN|Infinity/);
});
test('admin access and feature isolation',()=>{
 assert.match(fs.readFileSync('app/admin/(protected)/layout.tsx','utf8'),/await requireAdmin\(\)/);
 assert.doesNotMatch(fs.readFileSync('lib/global-audience-report.ts','utf8'),/notes-studio|isolated-database|demo-geography|gmail|sendWith/);
});
test('auth failure fails closed',async()=>{
 let calls=0;
 const s=load('lib/global-audience-report.ts',{'@/lib/auth':{isAdminAuthenticatedReadOnly:async()=>{throw Error('SECRET_SESSION_DATABASE');}},'@/lib/database':{query:async()=>{calls++;return [];}}},{process:{env:{SIGNUP_GEOGRAPHY_REPORT_ENABLED:'1'}}});
 assert.deepEqual(await s.loadGlobalAudienceReport(),{status:'unavailable'});assert.equal(calls,0);
});

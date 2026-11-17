import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadProject as load} from './helpers/load-project.mjs';
const production={VERCEL:'1',VERCEL_ENV:'production',SIGNUP_GEOGRAPHY_COLLECTION_ENABLED:'1',SIGNUP_GEOGRAPHY_INGRESS:'reviewed-vercel-direct-production'};
const gate=load('lib/signup-geography-server.ts');
const plain=value=>JSON.parse(JSON.stringify(value));
function request(url='https://www.behzadgh.com/api/subscribe',values={'x-vercel-ip-country':'US','x-vercel-ip-country-region':'NY'}){
 const reads=[];
 return {url,reads,headers:{get(name){reads.push(name);return values[name]??null;}}};
}

test('collection is default OFF and requires platform, environment and explicit server attestation',()=>{
 for(const env of [{},{...production,SIGNUP_GEOGRAPHY_COLLECTION_ENABLED:undefined},{...production,SIGNUP_GEOGRAPHY_COLLECTION_ENABLED:'0'},{...production,SIGNUP_GEOGRAPHY_COLLECTION_ENABLED:'true'},{...production,VERCEL:undefined},{...production,VERCEL_ENV:'development'},{...production,SIGNUP_GEOGRAPHY_INGRESS:undefined},{...production,SIGNUP_GEOGRAPHY_INGRESS:'reviewed-vercel-direct'}]){
  const r=request();assert.equal(gate.signupGeographyCollectionEnabled(env),false);assert.equal(gate.signupRequestGeography(r,env),undefined);assert.deepEqual(r.reads,[]);
 }
});

test('canonical Production origin reads only country and subdivision after server approval',()=>{
 const r=request();assert.deepEqual(plain(gate.signupRequestGeography(r,production)),{country:'US',region:'US-NY'});
 assert.deepEqual(r.reads,['x-vercel-ip-country','x-vercel-ip-country-region']);
});

test('apex, alternate deployments, ports, HTTP and misleading hostnames fail before reading metadata',()=>{
 for(const url of ['https://behzadgh.com/api/subscribe','http://www.behzadgh.com/api/subscribe','https://www.behzadgh.com:444/api/subscribe','https://test.vercel.app/api/subscribe','https://www.behzadgh.com.evil.invalid/api/subscribe','https://user@www.behzadgh.com/api/subscribe','not a URL']){
  const r=request(url);assert.equal(gate.signupRequestGeography(r,production),undefined);assert.deepEqual(r.reads,[]);
 }
});

test('locally spoofed headers, forwarded hosts and legacy flags cannot establish ingress trust',()=>{
 const r=request('https://www.behzadgh.com/api/subscribe',{'x-vercel-ip-country':'CA','x-vercel-ip-country-region':'ON','x-vercel-id':'synthetic','x-forwarded-host':'www.behzadgh.com','host':'www.behzadgh.com'});
 assert.equal(gate.signupRequestGeography(r,{SIGNUP_GEOGRAPHY_ENABLED:'1',SIGNUP_GEOGRAPHY_REPORT_ENABLED:'1'}),undefined);assert.deepEqual(r.reads,[]);
});

test('missing, malformed and unsupported subdivisions safely retain Unknown',()=>{
 for(const values of [{},{'x-vercel-ip-country':'ZZ','x-vercel-ip-country-region':'BAD'}])assert.deepEqual(plain(gate.signupRequestGeography(request(undefined,values),production)),{country:null,region:null});
 assert.deepEqual(plain(gate.signupRequestGeography(request(undefined,{'x-vercel-ip-country':'IR','x-vercel-ip-country-region':'07'}),production)),{country:'IR',region:null});
});

test('Preview remains scoped to its exact deployment hostname and separate attestation',()=>{
 const preview={...production,VERCEL_ENV:'preview',VERCEL_URL:'synthetic-preview.vercel.app',SIGNUP_GEOGRAPHY_INGRESS:'reviewed-vercel-direct'};
 assert.deepEqual(plain(gate.signupRequestGeography(request('https://synthetic-preview.vercel.app/api/subscribe'),preview)),{country:'US',region:'US-NY'});
 for(const env of [{...preview,VERCEL_URL:'www.behzadgh.com'},{...preview,VERCEL_URL:'synthetic-preview.vercel.app.evil.invalid'},{...preview,SIGNUP_GEOGRAPHY_INGRESS:'reviewed-vercel-direct-production'}])assert.equal(gate.signupGeographyCollectionEnabled(env),false);
 assert.equal(gate.signupRequestGeography(request(),preview),undefined);
});

test('reporting, diagnostics and email flags neither enable nor disable collection',()=>{
 for(const flag of ['0','1']){
  const extra={SIGNUP_GEOGRAPHY_REPORT_ENABLED:flag,SIGNUP_GEOGRAPHY_DIAGNOSTIC_ENABLED:flag,CONFIRMATION_IMMEDIATE_DELIVERY_ENABLED:flag};
  assert.equal(gate.signupGeographyCollectionEnabled({...production,...extra}),true);
  assert.equal(gate.signupGeographyCollectionEnabled({...production,...extra,SIGNUP_GEOGRAPHY_COLLECTION_ENABLED:'0'}),false);
 }
});

test('dynamic Follow page shares the collection gate and displays the existing disclosure whenever collection can run',()=>{
 for(const env of [production,{...production,VERCEL_ENV:'preview',VERCEL_URL:'preview.vercel.app',SIGNUP_GEOGRAPHY_INGRESS:'reviewed-vercel-direct'}]){
  const page=load('app/subscribe/page.tsx',{}, {process:{env}});
  assert.equal(page.dynamic,'force-dynamic');
  const html=renderToStaticMarkup(React.createElement(page.default));
  assert.match(html,/our hosting provider may estimate your country and state or province/);
  assert.match(html,/remove the location codes when you unsubscribe/);
 }
 const page=load('app/subscribe/page.tsx',{}, {process:{env:{...production,SIGNUP_GEOGRAPHY_COLLECTION_ENABLED:'0'}}});
 assert.doesNotMatch(renderToStaticMarkup(React.createElement(page.default)),/our hosting provider/);
});

test('every reviewed subdivision display entry is validated country-by-country without adding guessed codes',()=>{
 const {signupRegionNames,signupRegionDisplayName}=load('lib/signup-region-names.ts');
 const {normalizeSignupGeography}=load('lib/signup-geography.ts');
 for(const [country,names]of Object.entries(signupRegionNames))for(const [part,name]of Object.entries(names)){
  const code=country+'-'+part;assert.equal(normalizeSignupGeography(country,part).region,code);assert.equal(signupRegionDisplayName(code),name);
 }
 assert.equal(normalizeSignupGeography('CA','NY').region,null);
 assert.equal(signupRegionDisplayName('IR-07'),'IR-07');
});

test('0007 and 0008 geography guards precede the independent 0009 AFTER status-event mechanism',()=>{
 const read=name=>fs.readFileSync('db/'+name,'utf8');
 const seven=read('proposed-migrations/0007_subscriber_signup_geography.sql'),eight=read('proposed-migrations/0008_subscriber_geography_lifecycle.sql'),nine=read('proposed-migrations/0009_subscriber_event_transition_identity.sql'),four=read('migrations/0004_subscriber_event_history.sql');
 assert.match(seven,/signup_region VARCHAR\(6\)/);assert.match(seven,/signup_geography_is_first_registration_only/);
 assert.match(eight,/NEW.status <> 'active'/);assert.match(eight,/OLD.status <> 'active'/);
 assert.ok('subscribers_00_geography_lifecycle'<'subscribers_signup_geography_guard');
 assert.match(four,/AFTER INSERT OR UPDATE OF status ON subscribers/);
 assert.match(nine,/OLD.status IS DISTINCT FROM NEW.status/);
 assert.doesNotMatch(nine,/signup_country|signup_region|DELETE FROM subscriber_events/);
 assert.doesNotMatch(eight,/record_subscriber_status_event|DELETE FROM subscribers/);
});

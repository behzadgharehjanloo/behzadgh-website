import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import{loadProject as load}from'./helpers/load-project.mjs';
const geo=load('lib/signup-geography.ts'),analytics=load('lib/signup-geography-analytics.ts');const plain=v=>JSON.parse(JSON.stringify(v));
test('assigned country codes and reviewed subdivision suffixes normalize without guessing',()=>{
 for(const [country,region,expected]of [['us','ny','US-NY'],['CA','ON','CA-ON'],['GB','ENG','GB-ENG'],['AU','NSW','AU-NSW'],['DE','BE','DE-BE']])assert.deepEqual(plain(geo.normalizeSignupGeography(country,region)),{country:country.toUpperCase(),region:expected});
 assert.deepEqual(plain(geo.normalizeSignupGeography('IR','07')),{country:'IR',region:null});assert.deepEqual(plain(geo.normalizeSignupGeography('US','ZZ')),{country:'US',region:null});assert.deepEqual(plain(geo.normalizeSignupGeography('CA','NY')),{country:'CA',region:null});
});
test('missing, reserved, malformed, multi-value and Unicode-spoof metadata use Unknown',()=>{
 for(const value of [undefined,null,'','ZZ','UK','XK','EU','USA','US, CA','Uſ','ＵＳ','US\n','US\u0000','US<script>',{},'123'])assert.deepEqual(plain(geo.normalizeSignupGeography(value,'NY')),{country:null,region:null});
 for(const value of [undefined,null,'','US-NY','NY,CA','NY\n','NΥ','New York','../NY'])assert.equal(geo.normalizeSignupGeography('US',value).region,null);
});
test('local, Production, disabled, or unverified requests never read any headers',()=>{
 const headers={get(){throw Error('Untrusted headers must not be read');}};
 const approved={enabled:true,verifiedVercelEdgeIngress:true};
 for(const [trust,env]of [[{},{}],[approved,{}],[approved,{VERCEL:'1',VERCEL_ENV:'production'}],[{enabled:true},{VERCEL:'1',VERCEL_ENV:'preview'}],[{verifiedVercelEdgeIngress:true},{VERCEL:'1',VERCEL_ENV:'preview'}]])assert.equal(geo.readPreviewSignupGeography(headers,trust,env).country,null);
});
test('only a server-attested Vercel Preview may read the two geography headers',()=>{
 const requested=[],headers={get(name){requested.push(name);return {'x-vercel-ip-country':'US','x-vercel-ip-country-region':'NY','x-forwarded-for':'synthetic-address','x-vercel-ip-city':'Do not read'}[name]??null;}};
 assert.deepEqual(plain(geo.readPreviewSignupGeography(headers,{enabled:true,verifiedVercelEdgeIngress:true},{VERCEL:'1',VERCEL_ENV:'preview'})),{country:'US',region:'US-NY'});assert.deepEqual(requested,['x-vercel-ip-country','x-vercel-ip-country-region']);
});
test('prepared aggregate queries are read-only, parameterized, date bounded and count signup records',()=>{
 for(const dimension of ['country','subdivision','country-month']){
 const q=analytics.signupGeographyQuery({dimension,fromDay:'2026-03-01',throughDay:'2026-11-01',country:'US'});assert.match(q.text,/America\/New_York/);assert.match(q.text,/created_at/);assert.deepEqual(plain(q.params),['2026-03-01','2026-11-01','all','US']);assert.doesNotMatch(q.text,/INSERT|UPDATE|DELETE|email|preferred_name|subscriber_events/);
 }
 for(const bad of [{fromDay:'2026-02-30',throughDay:'2026-03-01'},{fromDay:'2026-04-01',throughDay:'2026-03-01'},{fromDay:'2026-03-01',throughDay:'2026-04-01',country:'US;DROP TABLE subscribers'}])assert.throws(()=>analytics.signupGeographyQuery({dimension:'country',...bad}));
});
test('small country/state/time groups withhold totals too; aggregate output never includes identifiers',()=>{
 const row={country:'US',region:null,month:null,count:8,email:'must-not-escape@example.invalid',id:'private'};
 const good=analytics.privateGeographySummary([row,{country:null,region:null,month:null,count:5}]);assert.equal(good.total,13);assert.equal(good.known,8);assert.equal(good.unknown,5);assert.doesNotMatch(JSON.stringify(good),/@|private|email/);
 const small=analytics.privateGeographySummary([row,{country:'CA',region:null,month:null,count:2}]);assert.equal(small.status,'withheld');assert.equal(small.total,null);assert.equal(small.groups.length,0);
 assert.throws(()=>analytics.privateGeographySummary([row,row]));assert.throws(()=>analytics.privateGeographySummary([{...row,count:-1}]));assert.equal(analytics.privateGeographySummary([]).total,0);
});
test('migration stays outside auto-discovery, adds nullable first-signup fields only and prevents backfill',()=>{
 const migration=fs.readFileSync('db/proposed-migrations/0007_subscriber_signup_geography.sql','utf8');assert.ok(!fs.existsSync('db/migrations/0007_subscriber_signup_geography.sql'));assert.match(migration,/ADD COLUMN IF NOT EXISTS signup_country CHAR\(2\)/);assert.match(migration,/ADD COLUMN IF NOT EXISTS signup_region VARCHAR\(6\)/);assert.match(migration,/signup_geography_is_first_registration_only/);assert.doesNotMatch(migration,/DROP TABLE|TRUNCATE|UPDATE subscribers SET|INSERT INTO subscribers|ip_address|latitude|longitude|postal|user_agent/);
});
test('signup preparation is gated and preserves duplicate/resubscribe protections',()=>{
 const gate=fs.readFileSync('lib/signup-geography-server.ts','utf8');assert.match(gate,/SIGNUP_GEOGRAPHY_COLLECTION_ENABLED/);assert.match(gate,/reviewed-vercel-direct-production/);assert.match(gate,/https:\/\/www\.behzadgh\.com/);
 const service=fs.readFileSync('lib/subscribers.ts','utf8');assert.ok(service.includes('ON CONFLICT (email) DO NOTHING'));assert.ok(service.includes('duplicate_active'));assert.ok(service.includes("SET status = 'pending'"));assert.ok(service.includes('confirmation_required'));
 assert.doesNotMatch(fs.readFileSync('components/FollowSignup.tsx','utf8'),/signup_country|signup_region|x-vercel-ip/);
});

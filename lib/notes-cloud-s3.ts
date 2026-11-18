import 'server-only';
import {createHash,createHmac} from 'node:crypto';

// Signed, short-lived private S3 URLs, no permanent object credentials in the browser.
// Neon Object Storage requires path-style addressing.
type Method='GET'|'PUT';
const EXPECTED_ENDPOINT='https://br-winter-sea-aiwpwvsx.storage.c-4.us-east-1.aws.neon.tech';
const EXPECTED_BUCKET='notes-studio-private-originals';
function sha256(s:string){return createHash('sha256').update(s).digest('hex');}
function hmac(k:Buffer|string,s:string){return createHmac('sha256',k).update(s).digest();}
function uri(s:string){return encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());}
function pathFor(key:string){
 if(!/^(quarantine|originals)\/[a-f0-9-]{36}\/(?:original|upload)$/.test(key))throw Error('Invalid private photograph key.');
 return '/'+EXPECTED_BUCKET+'/'+key.split('/').map(uri).join('/');
}
export function cloudEnabled(env:NodeJS.ProcessEnv=process.env){
 return env.NOTES_CLOUD_ENABLED==='1'&&env.NOTES_CLOUD_S3_ENDPOINT===EXPECTED_ENDPOINT&&env.NOTES_CLOUD_S3_BUCKET===EXPECTED_BUCKET
  &&!!env.NOTES_CLOUD_S3_KEY&&!!env.NOTES_CLOUD_S3_SECRET&&env.VERCEL_ENV==='production'&&env.NODE_ENV==='production';
}
export function requireCloud(){if(!cloudEnabled())throw Error('Original photo cloud storage is not yet enabled.');}
export function signPrivatePhoto(key:string,method:Method,contentType?:string,expires=120,now=new Date()){
 requireCloud();
 if(!Number.isInteger(expires)||expires<1||expires>180)throw Error('Invalid photo ticket expiry.');
 if(method==='PUT'&&!['image/jpeg','image/png'].includes(contentType??''))throw Error('Invalid photo MIME.');
 const endpoint=new URL(EXPECTED_ENDPOINT),date=now.toISOString().replace(/[:-]|\.\d{3}/g,''),stamp=date.slice(0,8);
 const scope=stamp+'/us-east-1/s3/aws4_request';
 const access=process.env.NOTES_CLOUD_S3_KEY!,secret=process.env.NOTES_CLOUD_S3_SECRET!;
 const signed=method==='PUT'?'content-type;host':'host';
 const headers=method==='PUT'?'content-type:'+contentType+'\nhost:'+endpoint.host+'\n':'host:'+endpoint.host+'\n';
 const params:Record<string,string>={
  'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':access+'/'+scope,
  'X-Amz-Date':date,'X-Amz-Expires':String(expires),'X-Amz-SignedHeaders':signed
 };
 const canonicalQuery=Object.keys(params).sort().map(k=>uri(k)+'='+uri(params[k])).join('&');
 const path=pathFor(key);
 const canonical=[method,path,canonicalQuery,headers,signed,'UNSIGNED-PAYLOAD'].join('\n');
 const stringToSign=['AWS4-HMAC-SHA256',date,scope,sha256(canonical)].join('\n');
 const keyDate=hmac('AWS4'+secret,stamp),keyRegion=hmac(keyDate,'us-east-1'),keyService=hmac(keyRegion,'s3'),keySign=hmac(keyService,'aws4_request');
 const signature=createHmac('sha256',keySign).update(stringToSign).digest('hex');
 return endpoint.origin+path+'?'+canonicalQuery+'&X-Amz-Signature='+signature;
}
export async function readPrivateOriginal(key:string,maximum=10_000_000){
 const response=await fetch(signPrivatePhoto(key,'GET',undefined,60),{cache:'no-store',signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw Error('Original photograph storage read failed.');
 const reported=Number(response.headers.get('content-length')??'0');
 if(reported>maximum)throw Error('Stored photograph exceeds the authorized limit.');
 const result=Buffer.from(await response.arrayBuffer());
 if(!result.length||result.length>maximum)throw Error('Stored photograph has an invalid size.');
 return result;
}
export async function putImmutableOriginal(key:string,bytes:Buffer,mime:'image/jpeg'|'image/png'){
 const response=await fetch(signPrivatePhoto(key,'PUT',mime,60),{
  method:'PUT',headers:{'Content-Type':mime,'If-None-Match':'*'},body:new Uint8Array(bytes),
  signal:AbortSignal.timeout(25000)
 });
 if(!response.ok)throw Error('Original photograph could not be written to private storage.');
}

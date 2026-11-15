import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {normalizeSignupGeography} from '@/lib/signup-geography';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const productionOrigin='https://www.behzadgh.com';
function reply(status:number,state:string,location?:{country:string|null;region:string|null}){return Response.json({status:state,...location?{...location,provenance:'unverified',activationApproved:false}:{},timestamp:new Date().toISOString()},{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'}});}
export function GET(){return reply(405,'method_not_allowed');}
export async function POST(request:Request){
 if(process.env.SIGNUP_GEOGRAPHY_DIAGNOSTIC_ENABLED!=='1'||process.env.VERCEL!=='1'||process.env.VERCEL_ENV!=='production')return reply(404,'unavailable');
 const url=new URL(request.url);
 if(url.origin!==productionOrigin||url.search||request.headers.get('origin')!==productionOrigin||request.headers.get('sec-fetch-site')!=='same-origin'||request.headers.get('x-admin-diagnostic')!=='signup-geography'||request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply(403,'forbidden');
 try{if(!await isAdminAuthenticatedReadOnly())return reply(401,'unauthorized');}catch{return reply(503,'unavailable');}
 return reply(200,'observation_only',normalizeSignupGeography(request.headers.get('x-vercel-ip-country'),request.headers.get('x-vercel-ip-country-region')));
}

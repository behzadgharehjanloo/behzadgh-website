import {createHash, timingSafeEqual} from 'node:crypto';
import {normalizeSignupGeography} from '@/lib/signup-geography';
import {query} from '@/lib/database';
import {audienceAggregateSql} from '@/lib/global-audience-report';
import {privateGeographySummary, type GeographyCount} from '@/lib/signup-geography-analytics';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const origin='https://www.behzadgh.com';
function response(status:number,body:Record<string,unknown>){
 return Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'}});
}
export async function POST(request:Request){
 if(process.env.VERCEL_ENV!=='production'||process.env.GEO_QA_TEMP_ENABLED!=='1')return response(404,{status:'disabled'});
 const supplied=request.headers.get('x-geo-qa-token')??'';
 const expected=process.env.GEO_QA_TEMP_TOKEN??'';
 if(!expected||supplied.length!==expected.length||!timingSafeEqual(createHash('sha256').update(supplied).digest(),createHash('sha256').update(expected).digest()))return response(404,{status:'not_found'});
 const url=new URL(request.url);
 if(url.origin!==origin||url.search||request.headers.get('origin')!==origin)return response(403,{status:'forbidden'});
 const geographic=normalizeSignupGeography(request.headers.get('x-vercel-ip-country'),request.headers.get('x-vercel-ip-country-region'));
 try{
  const rows=await query<(GeographyCount&{dimension:string})>(audienceAggregateSql,[]);
  const select=(dim:string)=>rows.filter(r=>r.dimension===dim).map(({country,region,month,count})=>({country,region,month,count}));
  const countries=privateGeographySummary(select('country'));
  const regions=privateGeographySummary(select('region'));
  const months=privateGeographySummary(select('month'));
  return response(200,{status:'ok',edge:{country:geographic.country,region:geographic.region},report:{country:countries.status,region:regions.status,month:months.status}});
 }catch{return response(503,{status:'unavailable'});}
}

import 'server-only';
import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {query} from '@/lib/database';
import {privateGeographySummary,type GeographyCount} from './signup-geography-analytics';
export type AudienceReport = {status:'disabled'|'unauthorized'|'unavailable'|'withheld'} | {status:'available';total:number;known:number;unknown:number;countries:{code:string;count:number;regions:{code:string|null;count:number}[]}[];months:{month:string;count:number}[]};
// Current active snapshot, matching the Production Overview status predicate.
// Month means original signup cohort of currently active profiles, not historical growth.
// No caller-controlled date, country, status or cohort filters.
export const audienceAggregateSql = "SELECT signup_country AS country, signup_region AS region, to_char(date_trunc('month',to_timestamp(created_at) AT TIME ZONE 'America/New_York'),'YYYY-MM') AS month, COUNT(*)::int AS count FROM subscribers WHERE status = 'active' GROUP BY 1,2,3 ORDER BY 1,2,3";
export async function loadGlobalAudienceReport():Promise<AudienceReport> {
 try {if(!await isAdminAuthenticatedReadOnly())return {status:'unauthorized'};}catch{return {status:'unavailable'};}
 if(process.env.SIGNUP_GEOGRAPHY_REPORT_ENABLED!=='1')return {status:'disabled'};
 try {
  const summary=privateGeographySummary(await query<GeographyCount>(audienceAggregateSql,[]));
  if(summary.status==='withheld')return {status:'withheld'};
  const countries=new Map<string,{code:string;count:number;regions:Map<string|null,number>}>(),months=new Map<string,number>();
  for(const cell of summary.groups){
   if(!cell.month)throw Error('Invalid timeline');
   months.set(cell.month,(months.get(cell.month)??0)+cell.count);
   if(cell.country){let country=countries.get(cell.country);if(!country){country={code:cell.country,count:0,regions:new Map()};countries.set(cell.country,country);}country.count+=cell.count;country.regions.set(cell.region,(country.regions.get(cell.region)??0)+cell.count);}
  }
  return {status:'available',total:summary.total,known:summary.known,unknown:summary.unknown,
   countries:[...countries.values()].filter(c=>c.count>0).map(c=>({code:c.code,count:c.count,regions:[...c.regions].map(([code,count])=>({code,count}))})).sort((a,b)=>b.count-a.count),
   months:[...months].sort(([a],[b])=>a.localeCompare(b)).map(([month,count])=>({month,count}))};
 }catch{return {status:'unavailable'};}
}

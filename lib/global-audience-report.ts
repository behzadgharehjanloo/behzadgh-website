import 'server-only';
import {isAdminAuthenticatedReadOnly} from '@/lib/auth';
import {query} from '@/lib/database';
import {privateGeographySummary,type GeographyCount} from './signup-geography-analytics';

export type AudienceReport =
 | {status:'disabled'|'unauthorized'|'unavailable'|'withheld'}
 | {status:'available';total:number;known:number;unknown:number;countries:{code:string;count:number;regions:{code:string|null;count:number}[]}[];months:{month:string;count:number}[];regionsAvailable:boolean;monthsAvailable:boolean};
type Dimension='country'|'region'|'month';
type AggregateCell=GeographyCount&{dimension:Dimension};

// Independent aggregation avoids suppressing the entire country map because one
// original signup month or one subdivision has fewer than five active subscribers.
// Each dimension is suppressed in full if ANY of its groups has fewer than five.
// The whole country view is withheld until every nonzero country/Unknown group
// is reportable. No filtering or smaller-group count is exposed to callers.
export const audienceAggregateSql = `
WITH source AS (
 SELECT signup_country, signup_region,
 to_char(date_trunc('month',to_timestamp(created_at) AT TIME ZONE 'America/New_York'),'YYYY-MM') AS signup_month
 FROM subscribers WHERE status = 'active'
)
SELECT 'country'::text AS dimension, signup_country AS country, NULL::text AS region,
 NULL::text AS month, COUNT(*)::int AS count FROM source GROUP BY signup_country
UNION ALL
SELECT 'region', signup_country, signup_region, NULL::text, COUNT(*)::int
 FROM source GROUP BY signup_country,signup_region
UNION ALL
SELECT 'month', NULL::text, NULL::text, signup_month, COUNT(*)::int
 FROM source GROUP BY signup_month
`;

export async function loadGlobalAudienceReport():Promise<AudienceReport> {
 try {if(!await isAdminAuthenticatedReadOnly())return {status:'unauthorized'};}catch{return {status:'unavailable'};}
 if(process.env.SIGNUP_GEOGRAPHY_REPORT_ENABLED!=='1')return {status:'disabled'};
 try {
  const rows=await query<AggregateCell>(audienceAggregateSql,[]);
  if(rows.some(r=>!['country','region','month'].includes(r.dimension)))throw Error('Invalid dimension');
  const cells=(dimension:Dimension)=>rows.filter(r=>r.dimension===dimension).map(({country,region,month,count})=>({country,region,month,count}));
  const countryRows=cells('country'),regionRows=cells('region'),monthRows=cells('month');
  if(countryRows.some(r=>r.region!==null||r.month!==null) ||
    regionRows.some(r=>r.month!==null) ||
    monthRows.some(r=>r.country!==null||r.region!==null))throw Error('Invalid dimension cells');

  const countriesSummary=privateGeographySummary(countryRows);
  if(countriesSummary.status==='withheld')return {status:'withheld'};
  const regionsSummary=privateGeographySummary(regionRows);
  const monthsSummary=privateGeographySummary(monthRows);
  const regionsAvailable=regionsSummary.status==='available' &&
    regionsSummary.total===countriesSummary.total;
  const monthsAvailable=monthsSummary.status==='available' &&
    monthsSummary.total===countriesSummary.total;
  const regions=new Map<string,{code:string|null;count:number}[]>();
  if(regionsAvailable)for(const cell of regionsSummary.groups){
   if(cell.country)regions.set(cell.country,[...(regions.get(cell.country)??[]),{code:cell.region,count:cell.count}]);
  }
  return {status:'available',total:countriesSummary.total,known:countriesSummary.known,
   unknown:countriesSummary.unknown,regionsAvailable,monthsAvailable,
   countries:countriesSummary.groups.filter(c=>c.country!==null).map(c=>({
     code:c.country!,count:c.count,regions:regions.get(c.country!)??[]
   })).sort((a,b)=>b.count-a.count),
   months:monthsAvailable ? monthsSummary.groups.map(c=>({month:c.month!,count:c.count}))
     .sort((a,b)=>a.month.localeCompare(b.month)) : []
  };
 }catch{return {status:'unavailable'};}
}

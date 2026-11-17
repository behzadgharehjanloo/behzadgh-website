import {normalizeSignupGeography} from './signup-geography';
export type GeographyDimension='country'|'subdivision'|'country-month';
export type GeographyCount={country:string|null;region:string|null;month:string|null;count:number};
const minimumGroupSize=5;
function day(value:string) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Invalid reporting date');
 return value;
}
/** Preparation only. Return a parameterized SELECT; never open a database here.
 * Country counts / subdivisions / new signup records by month; NOT active-member
 * balances or reactivation counts. Use the existing scoped subscriber query adapter.
 */
export function signupGeographyQuery(input:{dimension:GeographyDimension;fromDay:string;throughDay:string;status?:'all'|'active';country?:string}) {
 const from=day(input.fromDay),through=day(input.throughDay);
 if(from>through||!['country','subdivision','country-month'].includes(input.dimension)||!['all','active'].includes(input.status??'all'))throw Error('Invalid geography report');
 const country=input.country?normalizeSignupGeography(input.country,null).country:null;
 if(input.country&&!country)throw Error('Invalid country filter');
 const subdivision=input.dimension==='subdivision',timeline=input.dimension==='country-month';
 const region=subdivision?'signup_region':'NULL::text',month=timeline?"to_char(date_trunc('month',to_timestamp(created_at) AT TIME ZONE 'America/New_York'),'YYYY-MM')":'NULL::text';
 return {text:`SELECT signup_country AS country, ${region} AS region, ${month} AS month, COUNT(*)::int AS count
 FROM subscribers WHERE created_at >= EXTRACT(EPOCH FROM ($1::date::timestamp AT TIME ZONE 'America/New_York'))::bigint
 AND created_at < EXTRACT(EPOCH FROM (($2::date+1)::timestamp AT TIME ZONE 'America/New_York'))::bigint
 AND ($3::text='all' OR status=$3) AND ($4::text IS NULL OR signup_country=$4)
 GROUP BY 1,2,3 ORDER BY 3 NULLS FIRST,1 NULLS LAST,2 NULLS LAST`,params:[from,through,input.status??'all',country]};
}
/** Suppress the WHOLE view if any nonzero cell is small, avoiding complementary
 * suppression leakage. No individual IDs, addresses or precise counts for hidden
 * groups. Not differential privacy: overlapping queries/exports need review before UI wiring.
 */
export function privateGeographySummary(rows:GeographyCount[]) {
 const keys=new Set<string>();
 const safe=rows.map(row=>{
  const normalized=normalizeSignupGeography(row.country,row.region?.split('-').slice(1).join('-'));
  if(!Number.isSafeInteger(row.count)||row.count<0||normalized.country!==row.country||normalized.region!==row.region||row.month!==null&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month))throw Error('Invalid aggregate cell');
  const key=JSON.stringify([row.country,row.region,row.month]);if(keys.has(key))throw Error('Duplicate aggregate cell');keys.add(key);
  return {country:row.country,region:row.region,month:row.month,count:row.count};
 });
 if(safe.some(r=>r.count>0&&r.count<minimumGroupSize))return {status:'withheld' as const,groups:[],total:null,known:null,unknown:null,minimumGroupSize};
 const total=safe.reduce((n,r)=>n+r.count,0),unknown=safe.filter(r=>r.country===null).reduce((n,r)=>n+r.count,0);
 return {status:'available' as const,groups:safe,total,known:total-unknown,unknown,minimumGroupSize};
}

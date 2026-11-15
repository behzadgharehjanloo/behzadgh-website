// Preparation only: no request handler imports this module. No database or logging.
// Country allowlist: assigned ISO 3166-1 alpha-2 codes; reserved/pseudo codes excluded.
const countries=new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));
// Conservative first-level registry. Other countries retain valid country + Unknown region.
// Expand only from reviewed ISO 3166-2 data; syntactically plausible is not validation.
const subdivisions:Record<string,Set<string>>={
 US:new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC AS GU MP PR UM VI'.split(' ')),
 CA:new Set('AB BC MB NB NL NS NT NU ON PE QC SK YT'.split(' ')),
 GB:new Set('ENG NIR SCT WLS'.split(' ')),
 AU:new Set('ACT NSW NT QLD SA TAS VIC WA'.split(' ')),
 DE:new Set('BW BY BE BB HB HH HE MV NI NW RP SL SN ST SH TH'.split(' '))
};
export type SignupGeography={country:string|null;region:string|null};
export const unknownSignupGeography=():SignupGeography=>({country:null,region:null});
function code(value:unknown,max:number) {
 if(typeof value!=='string'||value.length>max||! /^[A-Za-z0-9 ]*$/.test(value))return null;
 return value.trim().toUpperCase();
}
/** Call only on metadata whose server-side provenance has already been verified. */
export function normalizeSignupGeography(countryValue:unknown,regionValue:unknown):SignupGeography {
 const country=code(countryValue,8);if(!country||!countries.has(country))return unknownSignupGeography();
 const part=code(regionValue,8);
 const region=part&&/^[A-Z0-9]{1,3}$/.test(part)&&subdivisions[country]?.has(part)?country+'-'+part:null;
 return {country,region};
}
export type PreviewGeoTrust={enabled?:boolean;verifiedVercelEdgeIngress?:boolean};
/** Inert by default; Production/local are always Unknown in this preparation phase.
 * The attestation must come from reviewed SERVER ingress configuration, never a
 * request field, x-vercel-id, forwarded host, or any user-controlled header.
 * No app caller or attestation provider is installed by this change.
 */
export function readPreviewSignupGeography(headers:Pick<Headers,'get'>,trust:PreviewGeoTrust={},environment:Record<string,string|undefined>=process.env):SignupGeography {
 if(!trust.enabled||trust.verifiedVercelEdgeIngress!==true||environment.VERCEL!=='1'||environment.VERCEL_ENV!=='preview')return unknownSignupGeography();
 return normalizeSignupGeography(headers.get('x-vercel-ip-country'),headers.get('x-vercel-ip-country-region'));
}

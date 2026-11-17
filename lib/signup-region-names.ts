/** Display-only English names, country-qualified to match the reviewed ISO
 * 3166-2 subset in signup-geography.ts. Never changes validation or stored codes.
 * Reference: ISO 3166-2 country subdivisions; names use familiar English forms.
 */
export const signupRegionNames:Readonly<Record<string,Readonly<Record<string,string>>>>={
 US:{AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',AS:'American Samoa',GU:'Guam',MP:'Northern Mariana Islands',PR:'Puerto Rico',UM:'United States Minor Outlying Islands',VI:'U.S. Virgin Islands'},
 CA:{AB:'Alberta',BC:'British Columbia',MB:'Manitoba',NB:'New Brunswick',NL:'Newfoundland and Labrador',NS:'Nova Scotia',NT:'Northwest Territories',NU:'Nunavut',ON:'Ontario',PE:'Prince Edward Island',QC:'Quebec',SK:'Saskatchewan',YT:'Yukon'},
 GB:{ENG:'England',NIR:'Northern Ireland',SCT:'Scotland',WLS:'Wales'},
 AU:{ACT:'Australian Capital Territory',NSW:'New South Wales',NT:'Northern Territory',QLD:'Queensland',SA:'South Australia',TAS:'Tasmania',VIC:'Victoria',WA:'Western Australia'},
 DE:{BW:'Baden-Württemberg',BY:'Bavaria',BE:'Berlin',BB:'Brandenburg',HB:'Bremen',HH:'Hamburg',HE:'Hesse',MV:'Mecklenburg-Western Pomerania',NI:'Lower Saxony',NW:'North Rhine-Westphalia',RP:'Rhineland-Palatinate',SL:'Saarland',SN:'Saxony',ST:'Saxony-Anhalt',SH:'Schleswig-Holstein',TH:'Thuringia'}
};
export function signupRegionDisplayName(code:string):string {
 const match=/^([A-Z]{2})-([A-Z0-9]{1,3})$/.exec(code);
 return match?signupRegionNames[match[1]]?.[match[2]]??code:code;
}

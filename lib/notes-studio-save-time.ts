// Original Local Studio saved-time format, fixed to the editorial New York time zone.
export function savedTime(value:unknown):string|null{
 if(typeof value!=='string'||!value)return null;
 const date=new Date(value);
 if(!Number.isFinite(date.getTime()))return null;
 const day=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'long',day:'numeric',year:'numeric'}).format(date);
 const time=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(date);
 return `Saved ${day} at ${time}`;
}

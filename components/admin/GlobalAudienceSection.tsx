import {redirect} from 'next/navigation';
import {loadGlobalAudienceReport} from '@/lib/global-audience-report';
import {GlobalAudienceReport} from './GlobalAudienceReport';
import '@/app/admin/(protected)/audience/audience.css';
export async function GlobalAudienceSection(){
 const report=await loadGlobalAudienceReport();
 if(report.status==='unauthorized')redirect('/admin/login');
 return <section id="global-audience" tabIndex={-1} aria-labelledby="global-audience-heading" className="audience-admin overview-audience scroll-mt-48 md:scroll-mt-28"><header><p className="audience-kicker">AROUND THE WORLD</p><h2 id="global-audience-heading">Global Audience</h2><p>Estimated signup location · current active subscribers, matching the Overview active count. Overview period and subscriber filters do not change this active snapshot.</p></header>{report.status==='available'?<GlobalAudienceReport report={report}/>:<div className="audience-panel" role="status"><h3>{report.status==='disabled'?'Reporting is disabled':report.status==='withheld'?'Location report withheld':'Reporting unavailable'}</h3><p>{report.status==='disabled'?'No geographic aggregate query was run. Collection remains independently controlled.':report.status==='withheld'?'At least one country or Unknown group has fewer than five active subscribers. No location counts or charts are exposed.':'The report could not be loaded. Missing migration or database errors are not shown as zero subscribers.'}</p></div>}<footer>Approximate signup estimates are not verified residence. Missing locations stay Unknown. Small groups are withheld; this does not guarantee anonymity across repeated reports.</footer></section>;
}

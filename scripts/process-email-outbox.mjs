import { processEmailOutbox } from "../lib/email-outbox.mjs";

const summary = await processEmailOutbox(10);
console.log(`Processed ${summary.processed} queued email item(s).`);

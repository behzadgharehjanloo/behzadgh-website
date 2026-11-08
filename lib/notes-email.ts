export type NoteEmailInput = { title: string; rawText: string; imageAlt: string };

import { escapeEmailHtml as escapeHtml, preferredNameSnapshot } from "@/lib/preferred-name.mjs";
// Pure approved serialized Note renderer. No subscriber queries, queue, or sender.
export function renderStudioEmail(draft: NoteEmailInput, imageDataUrl?: string, recipient: { preferredName?: unknown;imageCid?:unknown;unsubscribeUrl?:unknown } = {}) {
  const recipientSnapshot = preferredNameSnapshot(recipient.preferredName);
  const greeting = recipientSnapshot.greeting;
  const cid=typeof recipient.imageCid==='string'&&/^[A-Za-z0-9._@-]{1,120}$/.test(recipient.imageCid)?`cid:${recipient.imageCid}`:undefined;
  let unsubscribeUrl:string|undefined;
  if(typeof recipient.unsubscribeUrl==='string'){try{const url=new URL(recipient.unsubscribeUrl);if(url.origin==='https://behzadgh.com'&&!url.username&&!url.password&&!url.search&&!url.hash&&/^\/unsubscribe\/[A-Za-z0-9._~-]{1,1024}$/.test(url.pathname))unsubscribeUrl=url.toString();}catch{}}
  const safeImage = cid ?? (imageDataUrl && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl) ? imageDataUrl : undefined);
  // One memoir body in the source. Image-first source order is the safe mobile fallback;
  // direction on the presentation wrapper places that image on the desktop right.
  const paragraphs = draft.rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n\n').map(paragraph =>
    `<p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:19px;line-height:31px;white-space:pre-wrap;overflow-wrap:anywhere;word-wrap:break-word">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  const content = safeImage ? `<div dir="rtl" style="text-align:left;font-size:0;line-height:0">
<!--[if mso]><table role="presentation" width="696" dir="rtl" cellpadding="0" cellspacing="0" border="0"><tr><td width="313" valign="top"><![endif]-->
<div class="letter-photo-column" dir="ltr" style="display:inline-block;vertical-align:top;width:100%;max-width:313px;text-align:left">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse"><tr><td class="letter-photo-cell" style="padding:0 0 24px"><img src="${safeImage}" width="313" alt="${escapeHtml(draft.imageAlt)}" style="display:block;width:100%;max-width:100%;height:auto;border:0"></td></tr></table></div>
<!--[if mso]></td><td width="383" valign="top"><![endif]-->
<div class="letter-text-column" dir="ltr" style="display:inline-block;vertical-align:top;width:100%;max-width:383px;text-align:left">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;border-collapse:collapse"><tr><td class="letter-text-cell" style="padding:0 24px 0 0">${paragraphs}</td></tr></table></div>
<!--[if mso]></td></tr></table><![endif]--></div>` : paragraphs;
  return {
    subject: draft.title,
    text: `${greeting}\n\n${draft.rawText}${unsubscribeUrl ? `\n\nUnsubscribe: ${unsubscribeUrl}` : ""}`,
    noteText: draft.rawText,
    recipientSnapshot,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(draft.title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: cid:; style-src 'unsafe-inline'">
<style>
@media only screen and (min-width:600px){.letter-photo-column{width:45%!important;max-width:none!important}.letter-text-column{width:55%!important;max-width:none!important}}
@media only screen and (max-width:599px){.letter-padding{padding:28px 22px!important}.letter-title{font-size:27px!important;line-height:1.25!important}.letter-photo-column,.letter-text-column{display:block!important;width:100%!important;max-width:100%!important}.letter-text-cell{padding:0!important}}
</style></head><body style="margin:0;padding:0;background-color:#faf7f0;color:#17232c;-webkit-text-size-adjust:100%"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf7f0" style="width:100%;table-layout:fixed;border-collapse:collapse"><tr><td align="center">
<!--[if mso]><table role="presentation" width="760" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:760px;table-layout:fixed;border-collapse:collapse"><tr><td class="letter-padding" style="padding:36px 32px;font-family:Georgia,'Times New Roman',serif;color:#17232c">
<p style="margin:0 0 20px;font-size:19px;line-height:30px">${escapeHtml(greeting)}</p><table role="presentation" width="44" cellpadding="0" cellspacing="0" border="0" style="width:44px;border-collapse:collapse"><tr><td style="border-top:1px solid #b49a68;padding:0 0 20px;font-size:0;line-height:0">&nbsp;</td></tr></table>
<h1 class="letter-title" style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:38px;font-weight:400;overflow-wrap:anywhere;word-wrap:break-word">${escapeHtml(draft.title)}</h1>${content}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td style="padding:20px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;color:#6c6558"><table role="presentation" width="44" cellpadding="0" cellspacing="0" border="0" style="width:44px;border-collapse:collapse"><tr><td style="border-top:1px solid #b49a68;padding:0 0 12px;font-size:0;line-height:0">&nbsp;</td></tr></table>Behzad Gharehjanloo${unsubscribeUrl ? `<br><a href="${escapeHtml(unsubscribeUrl)}" style="display:inline-block;padding:12px 0;color:#6c6558;font-family:Arial,sans-serif;font-size:12px;line-height:20px;text-decoration:underline">Unsubscribe</a>` : ""}</td></tr></table>
</td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`
  };
}

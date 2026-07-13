const SENDER_ADDRESS = "still@behzadgh.com";

function cleanSiteUrl() {
  const url = new URL(process.env.SITE_URL ?? "https://behzadgh.com");
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("SITE_URL must use HTTPS in production");
  return url.origin;
}

function confirmationShell(content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f0e7;color:#27211c;font-family:Arial,sans-serif;line-height:1.6"><div style="max-width:600px;margin:0 auto;padding:40px 24px">${content}<p style="margin:36px 0 0;color:#6f665e;font-size:14px">Behzad Gharehjanloo<br><a href="mailto:${SENDER_ADDRESS}" style="color:#6f665e">${SENDER_ADDRESS}</a></p></div></body></html>`;
}

export function confirmationEmail(token) {
  const confirmUrl = `${cleanSiteUrl()}/confirm/${encodeURIComponent(token)}`;
  return {
    subject: "Confirm your subscription to Behzad’s notes",
    text: `You asked to receive occasional notes from Behzad Gharehjanloo.\n\nConfirm your subscription:\n${confirmUrl}\n\nThis link expires in 7 days. If you did not request this, you can ignore this email. You will not be subscribed.\n\nBehzad Gharehjanloo\n${SENDER_ADDRESS}`,
    html: confirmationShell(`<p style="margin:0 0 8px;color:#6f665e;font-size:13px;text-transform:uppercase;letter-spacing:.08em">Newsletter confirmation</p><h1 style="margin:0;font-family:Georgia,serif;font-size:38px;line-height:1.2;font-weight:normal">One last step.</h1><p style="margin:24px 0 0">You asked to receive occasional notes from Behzad Gharehjanloo.</p><p style="margin:28px 0"><a href="${confirmUrl}" style="display:inline-block;background:#27211c;color:#f6f0e7;text-decoration:none;border-radius:999px;padding:13px 22px;font-size:15px">Confirm subscription</a></p><p style="margin:0;color:#6f665e;font-size:14px">This link expires in 7 days. If you did not request this, ignore this email; you will not be subscribed.</p>`)
  };
}

export function welcomeEmail(unsubscribeToken) {
  const siteUrl = cleanSiteUrl();
  const unsubscribeUrl = `${siteUrl}/unsubscribe/${encodeURIComponent(unsubscribeToken)}`;
  return {
    subject: "Welcome.",
    text: `BEHZAD GHAREHJANLOO\n\nWelcome.\n\nWe’re glad to have you with us.\n\nIn future emails, we’ll share glimpses behind the scenes, moments of inspiration, and thoughtful reflections.\n\nYour privacy is important to us and will always be protected.\n\nBehzad Gharehjanloo\nwww.behzadgh.com\n\nWe respect your inbox and our privacy.\nYou can unsubscribe at any time.\n${unsubscribeUrl}`,
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;color:#0b1d33">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#ffffff">
    <tr><td align="center" style="padding:0">
      <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px;background:#fbfaf8;border:1px solid #d8d8d8">
        <tr><td align="center" style="padding:108px 34px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.4;letter-spacing:8px;color:#0b1d33">BEHZAD GHAREHJANLOO</td></tr>
        <tr><td align="center" style="padding:18px 0 0"><table role="presentation" width="62" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background:#bd913d;font-size:1px;line-height:1px">&nbsp;</td></tr></table></td></tr>
        <tr><td align="center" style="padding:70px 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:82px;line-height:1.05;font-weight:normal;color:#0b1d33">Welcome.</td></tr>
        <tr><td align="center" style="padding:46px 0 0"><table role="presentation" width="176" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background:#bd913d;font-size:1px;line-height:1px">&nbsp;</td></tr></table></td></tr>
        <tr><td align="center" style="padding:48px 48px 0;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:1.55;color:#101010">We’re glad to have you with us.</td></tr>
        <tr><td align="center" style="padding:28px 58px 0;font-family:Arial,Helvetica,sans-serif;font-size:19px;line-height:1.75;color:#101010">In future emails, we’ll share glimpses behind the<br>scenes, moments of inspiration, and thoughtful<br>reflections.</td></tr>
        <tr><td align="center" style="padding:28px 58px 0;font-family:Arial,Helvetica,sans-serif;font-size:19px;line-height:1.75;color:#101010">Your privacy is important to us and will<br>always be protected.</td></tr>
        <tr><td align="center" style="padding:55px 0 0"><table role="presentation" width="28" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background:#bd913d;font-size:1px;line-height:1px">&nbsp;</td></tr></table></td></tr>
        <tr><td align="center" style="padding:22px 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:21px;line-height:1.4;color:#101010">Behzad Gharehjanloo</td></tr>
        <tr><td align="center" style="padding:10px 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.4"><a href="${siteUrl}" style="color:#bd913d;text-decoration:none">www.behzadgh.com</a></td></tr>
        <tr><td style="padding:52px 70px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="height:1px;background:#bd913d;font-size:1px;line-height:1px">&nbsp;</td></tr></table></td></tr>
        <tr><td align="center" style="padding:30px 40px 84px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.8;color:#5f6268">We respect your inbox and our privacy.<br><a href="${unsubscribeUrl}" style="color:#5f6268;text-decoration:underline">You can unsubscribe at any time.</a></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    unsubscribeUrl
  };
}

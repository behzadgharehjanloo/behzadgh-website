const SENDER_ADDRESS = "still@behzadgh.com";

function cleanSiteUrl() {
  const url = new URL(process.env.SITE_URL ?? "https://behzadgh.com");
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL must use HTTPS in production");
  }
  return url.origin;
}

function shell(content) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;background:#f6f0e7;color:#27211c;font-family:Arial,sans-serif;line-height:1.6">
    <div style="max-width:600px;margin:0 auto;padding:40px 24px">
      ${content}
      <p style="margin:36px 0 0;color:#6f665e;font-size:14px">Behzad Gharehjanloo<br><a href="mailto:${SENDER_ADDRESS}" style="color:#6f665e">${SENDER_ADDRESS}</a></p>
    </div>
  </body>
</html>`;
}

function button(url, label) {
  return `<p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#27211c;color:#f6f0e7;text-decoration:none;border-radius:999px;padding:13px 22px;font-size:15px">${label}</a></p>`;
}

export function confirmationEmail(token) {
  const confirmUrl = `${cleanSiteUrl()}/confirm/${encodeURIComponent(token)}`;
  return {
    subject: "Confirm your subscription to Behzad’s notes",
    text: `You asked to receive occasional notes from Behzad Gharehjanloo.\n\nConfirm your subscription:\n${confirmUrl}\n\nThis link expires in 7 days. If you did not request this, you can ignore this email. You will not be subscribed.\n\nBehzad Gharehjanloo\n${SENDER_ADDRESS}`,
    html: shell(`
      <p style="margin:0 0 8px;color:#6f665e;font-size:13px;text-transform:uppercase;letter-spacing:.08em">Newsletter confirmation</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:38px;line-height:1.2;font-weight:normal">One last step.</h1>
      <p style="margin:24px 0 0">You asked to receive occasional notes from Behzad Gharehjanloo.</p>
      ${button(confirmUrl, "Confirm subscription")}
      <p style="margin:0;color:#6f665e;font-size:14px">This link expires in 7 days. If you did not request this, ignore this email; you will not be subscribed.</p>`)
  };
}

export function welcomeEmail(unsubscribeToken) {
  const unsubscribeUrl = `${cleanSiteUrl()}/unsubscribe/${encodeURIComponent(unsubscribeToken)}`;
  return {
    subject: "Welcome to my occasional notes",
    text: `Thank you for confirming. You’re now subscribed to occasional notes from Behzad Gharehjanloo.\n\nI’ll write when there is something worth sharing—notes, photographs, and stories, without a fixed schedule.\n\nYou are receiving this because you confirmed your subscription at behzadgh.com. You can unsubscribe at any time:\n${unsubscribeUrl}\n\nBehzad Gharehjanloo\n${SENDER_ADDRESS}`,
    html: shell(`
      <p style="margin:0 0 8px;color:#6f665e;font-size:13px;text-transform:uppercase;letter-spacing:.08em">Welcome</p>
      <h1 style="margin:0;font-family:Georgia,serif;font-size:38px;line-height:1.2;font-weight:normal">Thank you for confirming.</h1>
      <p style="margin:24px 0 0">You’re now subscribed to occasional notes from Behzad Gharehjanloo.</p>
      <p style="margin:18px 0 0">I’ll write when there is something worth sharing—notes, photographs, and stories, without a fixed schedule.</p>
      <p style="margin:28px 0 0;color:#6f665e;font-size:13px">You are receiving this because you confirmed your subscription at behzadgh.com. <a href="${unsubscribeUrl}" style="color:#6f665e">Unsubscribe at any time</a>.</p>`),
    unsubscribeUrl
  };
}

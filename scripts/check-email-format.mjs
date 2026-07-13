import { buildRawMessage } from "./gmail-api.mjs";
import { confirmationEmail, welcomeEmail } from "./email-templates.mjs";

const confirmation = await buildRawMessage({ to: "reader@example.com", ...confirmationEmail("A".repeat(43)) });
const welcome = await buildRawMessage({ to: "reader@example.com", ...welcomeEmail("B".repeat(43)) });
const unfold = (message) => message.toString("utf8").replace(/\r?\n[ \t]+/g, " ");
const confirmationText = unfold(confirmation);
const welcomeText = unfold(welcome);

for (const [name, message] of [["confirmation", confirmationText], ["welcome", welcomeText]]) {
  if (!message.includes("multipart/alternative") || !message.includes("text/plain") || !message.includes("text/html")) {
    throw new Error(`${name} email is not a multipart alternative message`);
  }
  if (!/^Message-ID: <[^\r\n]+@behzadgh\.com>/mi.test(message) || !/^From: Behzad Gharehjanloo <still@behzadgh\.com>/mi.test(message)) {
    throw new Error(`${name} email is missing sender or message identity headers`);
  }
}

if (/^List-Unsubscribe:/mi.test(confirmationText)) throw new Error("Confirmation email must not carry promotional unsubscribe headers");
if (!/^List-Unsubscribe: <https:\/\/behzadgh\.com\/unsubscribe\/[A-Za-z0-9_-]+>/mi.test(welcomeText)) throw new Error("Welcome email is missing List-Unsubscribe");
if (!/^List-Unsubscribe-Post: List-Unsubscribe=One-Click/mi.test(welcomeText)) throw new Error("Welcome email is missing RFC 8058 one-click signaling");

console.log("Confirmation and welcome email MIME checks passed.");

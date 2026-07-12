import { domainToASCII } from "node:url";

export function normalizeEmail(value) {
  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > 254 || /[\u0000-\u0020\u007f]/.test(trimmed)) return null;
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at !== trimmed.indexOf("@")) return null;
  const local = trimmed.slice(0, at);
  const asciiDomain = domainToASCII(trimmed.slice(at + 1));
  if (!asciiDomain || local.length > 64 || asciiDomain.length > 253 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;
  if (!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return null;
  const labels = asciiDomain.split(".");
  if (labels.length < 2 || labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) return null;
  return `${local.toLowerCase()}@${asciiDomain.toLowerCase()}`;
}

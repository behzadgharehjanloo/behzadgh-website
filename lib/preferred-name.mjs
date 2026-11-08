export const preferredNameTemplate = "Hi {{preferredName}},";

export function parsePreferredName(value) {
  if (value === undefined || value === null) return { value: null };
  if (typeof value !== "string") return { error: "Enter a preferred name using text, or leave it blank." };
  // Check BEFORE trimming: newlines or hidden control characters are invalid,
  // including when they surround an otherwise legitimate name.
  if (/[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value) || /\p{Cf}/u.test(value.replace(/[\u200c\u200d]/g, ""))) return { error: "Use a single-line name without control characters." };
  const name = value.trim();
  if (!name) return { value: null };
  if ([...name].length > 80) return { error: "Use no more than 80 characters for your preferred name." };
  // Unicode letters, marks, numbers, spaces, dashes, initials and apostrophes.
  // ZWNJ/ZWJ support Persian/Indic spelling, only inside a word.
  if (!/^[\p{L}\p{M}\p{N}\p{Zs}\p{Pd}.'\u2019\u02bc\u200c\u200d]+$/u.test(name)
      || !/[\p{L}\p{N}]/u.test(name)
      || /(?<![\p{L}\p{M}])[\u200c\u200d]|[\u200c\u200d](?![\p{L}\p{M}])/u.test(name)) {
    return { error: "Use a name without markup, template symbols, or unsafe formatting." };
  }
  return { value: name };
}

// A pure, recipient-scoped presentation helper. Never applies to the Note body.
export function preferredNameGreeting(value) {
  return preferredNameSnapshot(value).greeting;
}

export function preferredNameSnapshot(value) {
  const parsed = parsePreferredName(value);
  const preferredName = parsed.value || null;
  return Object.freeze({ preferredName, greeting: preferredNameTemplate.replace("{{preferredName}}", preferredName || "there") });
}

export function escapeEmailHtml(value) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

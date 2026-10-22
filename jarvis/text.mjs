// Small text helpers shared by the AI prompt builder, the reply module and the validators.

// Keeps line breaks (unlike briefing.clip, which flattens whitespace) — used for replies and drafts.
export function clipText(value, max) {
  const text = cleanText(String(value ?? "").slice(0, max * 4 + 1000)) // bound the work before any regex runs
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Header values must never contain a line break (that is how header injection works).
export function oneLine(value, max = 998) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

// Untrusted text goes inside XML-ish tags in the AI prompt; escaping stops it from closing or forging those tags.
export function xmlEscape(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function attrEscape(value) {
  return xmlEscape(value).replace(/"/g, "&quot;").replace(/[\r\n]+/g, " ");
}

// What the model (and the attention rules) are allowed to see: folds lookalike characters (fullwidth ＜ ＠ ...), drops invisible "tag" characters,
// bidi controls, zero-width characters and soft hyphens. Persian ZWNJ / emoji ZWJ survive only between letters.
export function cleanText(value) {
  return String(value ?? "").toWellFormed()
    .replace(/[\u{E0000}-\u{E007F}]/gu, "")
    .replace(/[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g, "")
    .replace(/[\u200B\u2060\uFEFF\u00AD\u180E]/g, "")
    .replace(/(?<![\p{L}])[\u200C\u200D]|[\u200C\u200D](?![\p{L}])/gu, "");
}

export function forAi(value) {
  return cleanText(String(value ?? "").normalize("NFKC"));
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const EMAIL_OBFUSCATED = /[A-Z0-9._%+-]+\s*(?:\(at\)|\[at\])\s*[A-Z0-9-]+(?:\s*(?:\(dot\)|\[dot\]|\sdot\s|\.)\s*[A-Z0-9-]+)+|[A-Z0-9._%+-]+\sat\s[A-Z0-9-]+(?:\s*(?:\(dot\)|\[dot\]|\sdot\s)\s*[A-Z0-9-]+)+/gi;
const PHONE_LANDLINE = /(?<![\w$.,-])\d{4}[ -]\d{4}(?![\w])/g;          // Melbourne landline without area code: 9123 4567
const PHONE_INTL = /(?<![\w$.,-])(?:\+(?!61\b)\d{1,3}|61(?=[\s-]?\(?0?\)?4))[\d\s().-]{8,16}\d(?!\w)/g;
// Australian-style phone numbers: +61 4xx xxx xxx, 04xx xxx xxx, (03) 9xxx xxxx. Project codes, dates and dollar amounts don't match.
const PHONE = /(?<![\w$.,-])(?:\+61|\(?0)[\d\s().-]{7,15}\d(?!\w)/g;

// What customers write can contain addresses and phone numbers (signatures, "call me on…"). Nothing that goes to the AI
// needs them, so they are replaced before the text leaves the system.
export function redact(value) {
  return forAi(value)
    // Persian and Arabic-Indic digits are read as ordinary digits, so a number written that way is still recognised as a phone number.
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (digit) => String.fromCharCode(48 + (digit.charCodeAt(0) & 15)))
    .replace(EMAIL, "[email]")
    .replace(EMAIL_OBFUSCATED, "[email]")
    .replace(PHONE, (match) => {
      const digits = match.replace(/\D/g, "").length;
      return digits >= 9 && digits <= 12 ? "[phone]" : match;
    })
    .replace(PHONE_INTL, "[phone]")
    .replace(PHONE_LANDLINE, "[phone]");
}

// "Jo Client <jo@example.com>" -> "Jo Client"; bare addresses become "[email]". The AI never needs an address.
export function displayName(who) {
  return oneLine(forAi(who).replace(/<[^>]*>/g, " ").replace(/\S+@\S+/g, "[email]"), 120);
}

// "Jo Client" -> "Jo"; "Doe, Jane" (Last, First) -> "Jane". Anything that doesn't look like a name gives "".
export function firstName(name) {
  const cleaned = displayName(name).replace(/\[email\]/g, "").replace(/^["'\s]+|["'\s]+$/g, "");
  const parts = cleaned.split(",");
  const candidate = (parts.length > 1 ? parts[1] : cleaned).trim();
  const first = candidate.split(/\s+/)[0] ?? "";
  return /^[\p{L}][\p{L}'’-]{0,29}$/u.test(first) ? first : "";
}

export async function sha256Hex(text) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text))));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Small text helpers shared by the AI prompt builder, the reply module and the validators.

// Keeps line breaks (unlike briefing.clip, which flattens whitespace) — used for replies and drafts.
export function clipText(value, max) {
  const text = String(value ?? "")
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

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Australian-style phone numbers: +61 4xx xxx xxx, 04xx xxx xxx, (03) 9xxx xxxx. Project codes, dates and dollar amounts don't match.
const PHONE = /(?<![\w$.,-])(?:\+61|\(?0)[\d\s().-]{7,15}\d(?!\w)/g;

// What customers write can contain addresses and phone numbers (signatures, "call me on…"). Nothing that goes to the AI
// needs them, so they are replaced before the text leaves the system.
export function redact(value) {
  return String(value ?? "")
    .replace(EMAIL, "[email]")
    .replace(PHONE, (match) => {
      const digits = match.replace(/\D/g, "").length;
      return digits >= 9 && digits <= 12 ? "[phone]" : match;
    });
}

// "Jo Client <jo@example.com>" -> "Jo Client"; bare addresses become "[email]". The AI never needs an address.
export function displayName(who) {
  return oneLine(String(who ?? "").replace(/<[^>]*>/g, " ").replace(/\S+@\S+/g, "[email]"), 120);
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

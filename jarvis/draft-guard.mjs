// FIX SKETCH 2: deterministic checks on an AI draft (add to jarvis/ai.mjs validateAiResult / assistant.mjs askJarvis).
//  (a) leakFrom:   shingles of the draft that come from OTHER records (not from the Owner's words, not from the open email)
//  (b) unsupported: numbers / money / URLs / dates / times / weekday+month names that appear in the draft but in neither the Owner's words nor the open email
//  (c) placeholders: "[email]", "[phone]", "[date]", "{{x}}", "<name>" ...
// Result: draft.warnings[] (shown in red in the panel; Send then needs a second explicit "I checked the highlighted lines" confirmation).
const norm = (s) => String(s ?? "").normalize("NFKC").toLowerCase();
const words = (s) => norm(s).match(/[\p{L}\p{N}$][\p{L}\p{N}$.,'’:/-]*/gu)?.map((w) => w.replace(/[.,:]+$/g, "")) ?? [];
function shingles(text, n = 4) { const w = words(text); const out = new Set(); for (let i = 0; i + n <= w.length; i += 1) out.add(w.slice(i, i + n).join(" ")); return out; }

const FACT = /(?:https?:\/\/\S+|www\.\S+|\$\s?\d[\d,]*(?:\.\d+)?|\b\d{1,2}[:.]\d{2}\s?(?:am|pm)?\b|\b\d{1,2}\s?(?:am|pm)\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b|\b(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\b|\b(?:today|tomorrow|next week|next month|this week|this friday)\b|\b\d{3,}\b|\b\d+(?:\.\d+)?\s?%)/giu;
const PLACEHOLDER = /\[(?:email|phone|date|price|name|amount|time|[^\]\n]{1,24})\]|\{\{[^}]+\}\}|<[A-Za-z][^>\n]{0,24}>/g;

export function checkDraft(body, { ownerText = "", emailText = "", otherRecords = [] }) {
  const warnings = [];
  const allowed = norm(`${ownerText}\n${emailText}`);
  const allowedShingles = shingles(`${ownerText}\n${emailText}`);
  // (a) content copied from unrelated records
  const bodyShingles = shingles(body);
  const leaked = [];
  for (const record of otherRecords) {
    const hit = [...shingles(`${record.title} ${record.preview}`)].filter((s) => bodyShingles.has(s) && !allowedShingles.has(s));
    if (hit.length) leaked.push({ id: record.id, sample: hit[0] });
  }
  if (leaked.length) warnings.push({ kind: "other_record_content", text: `This draft repeats text from ${leaked.length} other record(s) that you did not mention (for example “${leaked[0].sample}”). Remove it unless you meant to share it.`, ids: leaked.map((l) => l.id) });
  // (b) facts nobody supplied
  const facts = [...new Set((String(body).match(FACT) ?? []).map((f) => norm(f).trim()))].filter((f) => !allowed.includes(f));
  if (facts.length) warnings.push({ kind: "unsupported_fact", text: `These details are not in your words or in the email: ${facts.slice(0, 6).join(", ")}. Check them before sending.`, facts });
  // (c) placeholders
  const ph = [...new Set(String(body).match(PLACEHOLDER) ?? [])];
  if (ph.length) warnings.push({ kind: "placeholder", text: `The draft still has placeholders: ${ph.slice(0, 4).join(" ")}`, placeholders: ph });
  return warnings;
}

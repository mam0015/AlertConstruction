// Turns raw rows/emails into uniform items, flags the ones that need the Owner's attention, and writes the briefing.
// Pure functions only — no network, no database — so they are easy to test.

import { LIMITS } from "./policy.mjs";

const SIGNALS = Object.freeze([
  ["complaint", /\b(complain\w*|unhappy|not happy|disappointed|dissatisfied|unacceptable|poor quality|not impressed)\b/i],
  ["urgent", /\b(urgent\w*|asap|immediately|emergency|right away)\b/i],
  ["safety", /\b(unsafe|safety|injur\w*|accident|hazard\w*|asbestos|electrocut\w*|near miss)\b/i],
  ["delay", /\b(delay\w*|behind schedule|postpone\w*|running late|no access|can'?t access)\b/i],
  ["money", /\b(refund|overdue|unpaid|dispute\w*|chargeback|over budget|extra cost|cost blow ?out)\b/i],
  ["cancel", /\b(cancel\w*|terminat\w*|stop work|pull(?:ing)? out)\b/i],
  ["legal", /\b(lawyer|solicitor|legal action|ombudsman|tribunal|vcat|court)\b/i],
  ["damage", /\b(leak\w*|flood\w*|damage\w*|defect\w*|crack\w*|mould|mold)\b/i],
]);

const NOTHING_TO_REPORT = /^(none|nil|n\/?a|no|nothing|-+|\.)\.?$/i;

export function clip(value, max = LIMITS.previewChars) {
  const text = String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function flagText(...parts) {
  const text = parts.filter(Boolean).join(" \n ");
  return SIGNALS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export function hasRealIssue(text) {
  const value = String(text ?? "").trim();
  return value.length > 0 && !NOTHING_TO_REPORT.test(value);
}

function toISO(value) {
  const time = Date.parse(String(value ?? ""));
  return Number.isNaN(time) ? String(value ?? "") : new Date(time).toISOString();
}

// The only shape that ever leaves Jarvis. Extra columns from a query can never leak into the response.
export function makeItem({ id, source, kind, at, title, who = "", project = "", mailbox = "", body = "", extraFlags = [], flagFrom = [] }) {
  const flags = [...new Set([...extraFlags, ...flagText(title, body, ...flagFrom)])];
  return {
    id: String(id),
    source,
    kind,
    at: toISO(at),
    title: clip(title, 140),
    who: clip(who, 120),
    project: clip(project, 60),
    mailbox: clip(mailbox, 120),
    preview: clip(body),
    flags,
    urgent: flags.length > 0,
  };
}

export function searchItems(items, query) {
  const terms = String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return items;
  return items.filter((item) => {
    const haystack = `${item.title} ${item.preview} ${item.who} ${item.project} ${item.mailbox} ${item.kind} ${item.flags.join(" ")}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function sortNewestFirst(items) {
  return [...items].sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
}

function windowLabel(hours) {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "24 hours" : `${days} days`;
  }
  return `${hours} hours`;
}

function topCounts(items, pick, limit = 5) {
  const counts = new Map();
  for (const item of items) {
    const name = pick(item);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));
}

export function buildBriefing(items, { hours }) {
  const urgent = items.filter((item) => item.urgent);
  const bySource = {};
  for (const item of items) bySource[item.source] = (bySource[item.source] ?? 0) + 1;
  const span = windowLabel(hours);
  const headline = items.length === 0
    ? `Nothing new in the last ${span}.`
    : `${items.length} new ${items.length === 1 ? "item" : "items"} in the last ${span}${urgent.length ? ` — ${urgent.length} ${urgent.length === 1 ? "needs" : "need"} your attention.` : " — nothing flagged."}`;
  return {
    headline,
    counts: { total: items.length, urgent: urgent.length, bySource },
    attention: sortNewestFirst(urgent).slice(0, 8).map(({ id, source, kind, at, title, who, project, flags }) => ({ id, source, kind, at, title, who, project, flags })),
    employees: topCounts(items.filter((item) => item.source === "employee_updates"), (item) => item.who),
    clients: topCounts(items.filter((item) => item.source === "client_comments"), (item) => item.who),
  };
}

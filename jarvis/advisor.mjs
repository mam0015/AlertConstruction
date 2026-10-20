// Rule-based suggestions: what the Owner could do next about each item and each topic. Deterministic and offline —
// no AI involved — so every item always gets sensible advice, even when the AI key is not configured.
//
// The wording is fixed text (never built from the content of an email, comment or report), so nothing a customer or
// stranger writes can end up inside Jarvis's own advice.

import { sortNewestFirst } from "./briefing.mjs";

const BY_FLAG = Object.freeze({
  complaint: { action: "call", text: "Call the client today: listen, acknowledge the problem, then agree a clear next step and date." },
  urgent: { action: "check_with_team", text: "Treat this as same-day: decide who owns it and tell the person when they will hear back." },
  safety: { action: "check_with_team", text: "Make sure the area is safe first. Ask the supervisor for an incident note and photos, and pause the work if needed." },
  delay: { action: "check_with_team", text: "Confirm the new date with the trade, then update the client before they have to ask." },
  money: { action: "review", text: "Check the contract and payments before replying. Avoid agreeing to refunds or extra costs in writing until you have." },
  cancel: { action: "call", text: "Call before replying: find out why, and what would keep the job." },
  legal: { action: "review", text: "Do not argue in writing. Keep a copy of everything and get advice before replying." },
  damage: { action: "check_with_team", text: "Send someone to inspect within 24 hours and take dated photos. Check whether insurance needs to be told." },
  open_site_issue: { action: "check_with_team", text: "Ask the Site Supervisor for a plan and a date to close this issue, and whether the work should pause until then." },
  issue_reported: { action: "check_with_team", text: "Ask the person who reported it what is needed to clear the issue (materials, access, another trade)." },
});

const REPLY_WITH_JARVIS = { action: "reply_email", text: "Tell Jarvis what to say and it will draft the reply for you to check and send." };
const REPLY_YOURSELF = { action: "reply_email", text: "Reply from your mailbox (this mailbox is connected to Jarvis read-only)." };
const ACKNOWLEDGE_CLIENT = { action: "reply_email", text: "Reply within one business day, even if it is only a holding message." };

const ORDER = ["safety", "complaint", "legal", "cancel", "money", "damage", "urgent", "delay", "open_site_issue", "issue_reported"];

function unique(list) {
  const seen = new Set();
  return list.filter((entry) => (seen.has(entry.text) ? false : seen.add(entry.text)));
}

export function suggestForItem(item) {
  const found = ORDER.filter((flag) => item.flags.includes(flag)).map((flag) => BY_FLAG[flag]);
  if (item.kind === "email_received") found.push(item.email?.canReply ? REPLY_WITH_JARVIS : REPLY_YOURSELF);
  if (item.source === "client_comments") found.push(ACKNOWLEDGE_CLIENT);
  return unique(found).slice(0, 3);
}

export function withSuggestions(item) {
  return { ...item, suggestions: suggestForItem(item) };
}

function normaliseSubject(subject) {
  return String(subject ?? "").toLowerCase().replace(/^(?:\s*(?:re|fwd?|fw)\s*:\s*)+/i, "").replace(/\s+/g, " ").trim();
}

function topicOf(item) {
  if (item.project) return { key: `project:${item.project.toLowerCase()}`, title: `Project ${item.project}` };
  if (item.source === "company_email") {
    const subject = normaliseSubject(item.title);
    return { key: `thread:${subject}`, title: subject ? `Email: ${item.title.replace(/^(?:\s*(?:re|fwd?|fw)\s*:\s*)+/i, "")}` : "Email" };
  }
  return { key: `person:${item.who.toLowerCase()}`, title: item.who || "Other" };
}

// Groups items into topics (a project, an email thread, or a person) so the Owner can decide once per topic.
export function buildTopics(items, { max = 8 } = {}) {
  const topics = new Map();
  for (const item of sortNewestFirst(items)) {
    const { key, title } = topicOf(item);
    const topic = topics.get(key) ?? { key, title, count: 0, lastAt: item.at, sources: [], flags: [], urgent: false, itemIds: [], suggestions: [] };
    topic.count += 1;
    if (!topic.sources.includes(item.source)) topic.sources.push(item.source);
    for (const flag of item.flags) if (!topic.flags.includes(flag)) topic.flags.push(flag);
    topic.urgent = topic.urgent || item.urgent;
    if (topic.itemIds.length < 10) topic.itemIds.push(item.id);
    topic.suggestions = unique([...topic.suggestions, ...suggestForItem(item)]);
    topics.set(key, topic);
  }
  return [...topics.values()]
    .map((topic) => ({ ...topic, suggestions: topic.suggestions.slice(0, 4) }))
    .sort((a, b) => Number(b.urgent) - Number(a.urgent) || (Date.parse(b.lastAt) || 0) - (Date.parse(a.lastAt) || 0))
    .slice(0, max);
}

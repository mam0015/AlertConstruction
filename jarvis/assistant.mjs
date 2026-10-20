// "Ask Jarvis": the Owner types an instruction, Jarvis answers, suggests next steps, and — when an email is open —
// drafts a reply, or prepares an in-app message / calendar entry / task. The Owner's text is the only instruction source;
// records are data (see ai.mjs).
// Nothing here sends or does anything: drafts and actions are returned for the Owner to read and confirm
// (sendOwnerReply below sends a reply; actions.mjs carries out an action).

import { abandonSend, beginSend, finishSend, noteAsk } from "./audit.mjs";
import { aiEnabled, askAi, createAiClient, chooseRecords, DEFAULT_MODEL, friendlyAiError } from "./ai.mjs";
import { suggestForItem } from "./advisor.mjs";
import { clip, looseSearch } from "./briefing.mjs";
import { checkDraft } from "./draft-guard.mjs";
import { melbourneDate, runJarvis } from "./jarvis.mjs";
import { boundedInteger, JarvisAccessError, LIMITS } from "./policy.mjs";
import { proofread } from "./proofread.mjs";
import { MAX_REPLY_CHARS, readForAsk, sendReply } from "./reply.mjs";
import { parseAccounts } from "./sources/company-email.mjs";
import { clipText, firstName, sha256Hex } from "./text.mjs";

const MESSAGE_ID = /^[A-Za-z0-9_-]{6,64}$/;

export function parseAskInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new JarvisAccessError("Send the question as JSON.", 400);
  const message = clipText(body.message, 2000);
  if (!message) throw new JarvisAccessError("Tell Jarvis what you need.", 400);
  const history = (Array.isArray(body.history) ? body.history : []).slice(-8)
    .filter((turn) => turn && (turn.role === "owner" || turn.role === "jarvis") && typeof turn.content === "string")
    .map((turn) => ({ role: turn.role, content: clipText(turn.content, 2000) }))
    .filter((turn) => turn.content);
  let focus = null;
  if (body.focus !== undefined && body.focus !== null) {
    const mailbox = typeof body.focus?.mailbox === "string" ? body.focus.mailbox.slice(0, 200) : "";
    const messageId = typeof body.focus?.messageId === "string" ? body.focus.messageId : "";
    if (!mailbox || !MESSAGE_ID.test(messageId)) throw new JarvisAccessError("That email could not be found.", 400);
    focus = { mailbox, messageId };
  }
  const useOtherRecords = body.useOtherRecords === true;
  const currentDraft = typeof body.currentDraft === "string" ? clipText(body.currentDraft, MAX_REPLY_CHARS) : "";
  return { message, history, focus, useOtherRecords, currentDraft, hours: boundedInteger(body.hours, LIMITS.defaultHours, 1, LIMITS.maxHours, "hours") };
}

export function templateReply({ fromName, text, ownerName, company }) {
  const first = firstName(fromName);
  const signature = ownerName ? `${ownerName}\n${company}` : company;
  return clipText(`Hi${first ? ` ${first}` : ""},\n\n${text.trim()}\n\nKind regards,\n${signature}`, MAX_REPLY_CHARS);
}

const NEWS_QUESTION = /\b(news|what(?:'s| is| has| have)?\s+(?:new|happened|happening|going on)|anything new|any updates?|updates?|catch me up|brief me|bring me up to speed|khabar)\b|خبر|اخبار/i;
const PLANS_QUESTION = /\b(plans?|planned|upcoming|coming up|schedule|calendar|agenda|tomorrow|next week|this week|programme|program)\b|برنامه|تقویم/i;
const SOURCE_HEADING = { company_email: "Email", employee_updates: "Reports", client_comments: "Clients", team_messages: "Team messages", work: "Requests and projects", tasks: "Tasks", finance: "Money", people: "Team" };
const dayLabel = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const whenText = (iso) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? iso : dayLabel.format(date); };

// "What's the news?" without the AI: what happened, newest first, kept together by area. Only said when the Owner asked.
export function newsText(items, { perArea = 4 } = {}) {
  const areas = new Map();
  for (const item of items) {
    const list = areas.get(item.source) ?? [];
    if (list.length < perArea) list.push(item);
    areas.set(item.source, list);
  }
  return [...areas].map(([source, list]) => `${SOURCE_HEADING[source] ?? source}:\n${list.map((item) => `• ${whenText(item.at)} — ${item.title}${item.who && !item.title.includes(item.who) ? ` (${item.who.replace(/<[^>]*>/g, "").trim()})` : ""}${item.preview ? `: ${item.preview.slice(0, 140)}` : ""}`).join("\n")}`).join("\n\n");
}

export function plansText(plans, max = 12) {
  return plans.slice(0, max).map((plan) => `• ${plan.title}${plan.who ? ` — ${plan.who}` : ""}${plan.project ? ` [${plan.project}]` : ""}`).join("\n");
}

function suggestionsFor(items, max = 6) {
  const out = [];
  for (const item of items) {
    const [first] = suggestForItem(item);
    if (first) out.push({ title: clip(item.title, 140), why: first.text, action: first.action, itemId: item.id });
    if (out.length >= max) break;
  }
  return out;
}

// What Jarvis can do without AI: format the Owner's own words into a reply, or point at the matching records.
function rulesAnswer({ message, items, plans = [], preview, owner, company, notice, incomplete = "", failedOpen = false }) {
  if (preview) {
    return {
      reply: `${notice ? `${notice} ` : "Smart mode is off. "}I have put your words into a reply. Please read it, change anything you want, then press Send.`,
      suggestions: [],
      draft: { body: templateReply({ fromName: preview.toName || preview.original.from?.name, text: message, ownerName: owner.name, company }), note: "Written from your exact words — nothing was added." },
    };
  }
  if (failedOpen) {
    return { reply: `${notice} I did NOT write your reply, because I could not read that email. Please try again in a moment.`.trim(), suggestions: [], draft: null };
  }
  const lead = `${notice ? `${notice} ` : "Smart mode is off, so I looked through your records. "}`;
  if (PLANS_QUESTION.test(message) && !NEWS_QUESTION.test(message)) {
    return { reply: `${plans.length ? `${lead}This is what is planned, soonest first:\n${plansText(plans)}` : `${lead}Nothing is planned in the next ${LIMITS.planDays} days.`}${incomplete ? `\n\n${incomplete}` : ""}`, suggestions: [], draft: null };
  }
  if (NEWS_QUESTION.test(message)) {
    const news = newsText(items);
    return {
      reply: `${news ? `${lead}Here is what has happened, newest first:\n\n${news}` : `${lead}Nothing new has happened in this period.`}${incomplete ? `\n\n${incomplete}` : ""}`,
      suggestions: suggestionsFor(items.filter((item) => item.urgent)),
      draft: null,
    };
  }
  const matches = looseSearch(items, message);
  const chosen = (matches.length ? matches : items.filter((item) => item.urgent)).slice(0, 6);
  const lines = chosen.map((item) => `• ${item.title}${item.who ? ` — ${item.who.replace(/<[^>]*>/g, "").trim()}` : ""}`);
  return {
    reply: `${chosen.length
      ? `${lead}${matches.length ? "These match" : "These need your attention"}:\n${lines.join("\n")}`
      : `${lead}I found nothing matching in this period.`}${incomplete ? `\n\n${incomplete}` : ""}`,
    suggestions: suggestionsFor(chosen),
    draft: null,
  };
}

// What the screen needs to show about a proofreading run (never the full text again).
export function summariseProofread(report) {
  return {
    method: report.method, clean: report.clean, totalFixes: report.totalFixes, note: report.note,
    passes: report.passes.map((entry) => ({ n: entry.n, name: entry.name, method: entry.method, fixes: entry.fixes.slice(0, 12), note: entry.note })),
  };
}

/** @typedef {{ email: string, name: string, role: string }} TeamMember */
export async function askJarvis({ db, config, fetchImpl, ai, owner, input, people = /** @type {TeamMember[]} */ ([]), now = Date.now() }) {
  const company = config.company || "Alert Construction";
  await noteAsk(db, owner.email, now);

  const accounts = parseAccounts(config.accounts);
  let preview = null;
  let original = null;
  let replyProblem = "";
  let account = null;
  let openProblem = "";
  if (input.focus) {
    account = accounts.find((entry) => entry.label === input.focus.mailbox) ?? null;
    if (!account) throw new JarvisAccessError("That mailbox is not connected to Jarvis.", 404);
    try {
      ({ preview, original, replyProblem } = await readForAsk({ config, account, fetchImpl, messageId: input.focus.messageId }));
    } catch (error) {
      if (error instanceof JarvisAccessError) openProblem = error.message;
      else {
        console.error("Jarvis could not open the email:", error instanceof Error ? error.name : "unknown", error?.status ?? "");
        openProblem = "I could not open that email just now.";
      }
    }
  }

  const briefing = await runJarvis({ db, config, fetchImpl, params: { hours: String(input.hours), limit: "100" }, ownerEmail: owner.email, now });
  const focusId = input.focus ? `email:${input.focus.mailbox}:${input.focus.messageId}` : "";
  const items = briefing.items.filter((item) => item.id !== focusId);

  let outcome = null;
  let notice = openProblem || replyProblem;
  // Least privilege: while drafting a reply the AI sees this email plus records about the SAME thread or project - nothing else, unless the
  // Owner ticks "use other records". Unrelated customers' comments, staff reports and the other mailboxes are the exfiltration/injection channel.
  const isRelated = (item) => !original || item.email?.threadId === original.threadId
    || Boolean(item.project && original.text.toLowerCase().includes(item.project.toLowerCase()));
  const usable = input.useOtherRecords ? items : items.filter(isRelated);
  const withheld = items.length - usable.length;
  const today = melbourneDate(now);
  // Plans are other people's calendar text; while drafting an email they stay out of the AI's view unless the Owner ticked "use other records".
  const plans = original && !input.useOtherRecords ? [] : briefing.plans;
  if (aiEnabled(config) && !openProblem) {
    const records = chooseRecords(usable);
    try {
      const answer = await askAi({
        client: ai?.client ?? createAiClient(config),
        model: config.model || DEFAULT_MODEL,
        ownerName: owner.name, company,
        message: input.message, history: input.history, records, hours: input.hours,
        focus: original ? { mailbox: account.label, fromName: preview?.toName || original.from?.name || "", subject: original.subject, text: original.text, cut: original.textCut } : null,
        canDraft: Boolean(preview),
        sourceStatus: Object.fromEntries(Object.entries(briefing.sources).map(([name, report]) => [name, report.status])),
        totalRecords: usable.length,
        currentDraft: preview ? input.currentDraft : "",
        plans, people, today, ownerEmail: owner.email,
        itemIds: new Set([...records.map((item) => item.id), ...(focusId ? [focusId] : [])]),
        useFallbacks: config.aiFallbacks !== "off",
      });
      if (answer.refused) notice = "The AI declined this request.";
      else outcome = { mode: "ai", ...answer.result, usage: answer.usage, model: answer.model };
    } catch (error) {
      // Only the kind of failure is logged: the message of an upstream error can repeat what was sent (customer text).
      console.error("Jarvis AI request failed:", error instanceof Error ? error.name : "unknown", error?.status ?? "");
      notice = friendlyAiError(error);
    }
  }
  const incomplete = (briefing.briefing.incomplete ?? []).length
    ? `Note: I could not fully read ${(briefing.briefing.incomplete).map((entry) => entry.label).join(" and ")}, so this answer may be incomplete.` : "";
  if (!outcome) outcome = { mode: "rules", ...rulesAnswer({ message: input.message, items, plans: briefing.plans, preview, owner, company, notice: aiEnabled(config) || openProblem || replyProblem ? notice : "", incomplete, failedOpen: Boolean(input.focus) && !preview && !replyProblem }) };
  else if (incomplete && outcome.mode === "ai") outcome.reply = `${outcome.reply}\n\n${incomplete}`;

  if (replyProblem && outcome.mode === "ai") outcome.reply = `${outcome.reply}\n\n(I can't draft a reply to this one: ${replyProblem})`.trim();
  if (outcome.draftDropped && !replyProblem) {
    outcome.reply = `${outcome.reply}\n\n(To draft a reply, open the email in Jarvis and press "Reply with Jarvis" first.)`.trim();
  }
  // The Owner sees the draft already cleaned of obvious slips (three quick rule passes). The full three-pass check by the AI runs when they send.
  let draftReport = null;
  if (outcome.draft && preview) {
    draftReport = await proofread(outcome.draft.body, { maxChars: MAX_REPLY_CHARS });
    if (draftReport.text !== outcome.draft.body) outcome.draft = { ...outcome.draft, body: draftReport.text };
  }
  const warnings = outcome.draft && preview
    ? checkDraft(outcome.draft.body, {
      ownerText: [input.message, ...input.history.filter((turn) => turn.role === "owner").map((turn) => turn.content)].join("\n"),
      emailText: preview.original.text,
      otherRecords: items.filter((item) => !isRelated(item)),
    })
    : [];
  const draft = outcome.draft && preview ? {
    mailbox: account.label,
    messageId: input.focus.messageId,
    to: preview.to,
    toName: preview.toName,
    subject: preview.subject,
    body: outcome.draft.body,
    note: outcome.draft.note,
    canSend: account.canReply,
    from: preview.from, replyTo: preview.replyTo, crossDomain: preview.crossDomain, automatedReason: preview.automated, auth: preview.auth,
    warnings,
    otherRecordsWithheld: input.useOtherRecords ? 0 : withheld,
    proofread: draftReport ? summariseProofread(draftReport) : null,
  } : null;
  const actions = outcome.actions ?? [];
  if ((outcome.actionsDropped ?? []).length && outcome.mode === "ai") {
    outcome.reply = `${outcome.reply}\n\n(I could not prepare ${outcome.actionsDropped.length === 1 ? "one thing" : `${outcome.actionsDropped.length} things`}: ${[...new Set(outcome.actionsDropped)].join(" ")})`.trim();
  }
  return {
    mode: outcome.mode,
    reply: outcome.reply || "I have nothing to add.",
    suggestions: outcome.suggestions,
    draft,
    actions,
    notice: outcome.mode === "rules" ? notice : "",
    usage: outcome.usage ?? null,
    model: outcome.model ?? "",
  };
}

// Runs only when the Owner presses Send on a draft. The recipient is derived from the original email (reply.mjs).
export async function sendOwnerReply({ db, config, fetchImpl, ai, owner, input, now = Date.now() }) {
  if (!input || typeof input !== "object" || input.confirm !== true) throw new JarvisAccessError("Confirm before sending.", 400);
  const mailbox = typeof input.mailbox === "string" ? input.mailbox : "";
  const messageId = typeof input.messageId === "string" ? input.messageId : "";
  if (!MESSAGE_ID.test(messageId)) throw new JarvisAccessError("That email could not be found.", 400);
  const account = parseAccounts(config.accounts).find((entry) => entry.label === mailbox);
  if (!account) throw new JarvisAccessError("That mailbox is not connected to Jarvis.", 404);
  if (!account.canReply) throw new JarvisAccessError("This mailbox is connected read-only. Reconnect it with --allow-replies to let Jarvis send replies.", 403);
  if (typeof input.body !== "string") throw new JarvisAccessError("The reply must be text.", 400);
  if (typeof input.to !== "string" || !input.to) throw new JarvisAccessError("Send the draft as it was shown, including who it is addressed to.", 400);
  const typed = clipText(input.body, MAX_REPLY_CHARS);
  if (typed.length < 2) throw new JarvisAccessError("The reply is empty.", 400);

  // The writing is checked three times before anything leaves: spelling, grammar and punctuation, then a final read-through.
  // Only corrections are allowed (see proofread.mjs); if the check cannot be trusted the Owner's text goes out exactly as written.
  const report = input.proofread === false ? null : await proofread(typed, {
    client: aiEnabled(config) ? (ai?.client ?? createAiClient(config)) : null, model: config.model || DEFAULT_MODEL, maxChars: MAX_REPLY_CHARS,
  });
  const body = report ? report.text : typed;

  let claim = 0;
  let sent;
  try {
    sent = await sendReply({
      config, account, fetchImpl, messageId, body,
      allow: { replyTo: input.confirmReplyTo === true, automated: input.confirmAutomated === true },
      beforeSend: async ({ to, subject }) => {
        // The click is bound to the address that was SHOWN: if the email's reply address is no longer that one, nothing is sent.
        if (to !== input.to.trim().toLowerCase()) throw new JarvisAccessError(`The reply address changed since you looked at the draft (it is now ${to}). Open the email again and re-check before sending.`, 409);
        // The once-only claim is on the text the Owner wrote (a second click re-checks the same words, but the checker may word a fix differently).
        claim = await beginSend(db, { ownerEmail: owner.email, mailbox, messageId, recipient: to, subject, bodySha256: await sha256Hex(typed), bodyChars: body.length }, now);
      },
    });
  } catch (error) {
    // A clean failure frees the claim so the Owner can retry; if Google never answered, the reply may have gone out, so the
    // claim stays (it stops blocking after a few minutes) and the Owner is told to check the Sent folder.
    if (claim && !error?.uncertain) await abandonSend(db, claim).catch(() => undefined);
    throw error;
  }
  // The email is out. Whatever happens to the bookkeeping from here on must not turn this into a reported failure.
  await finishSend(db, claim, sent.sentId).catch((error) => console.error("Jarvis could not record a sent reply:", error instanceof Error ? error.name : "unknown"));
  return { ok: true, mailbox, to: sent.to, subject: sent.subject, sentId: sent.sentId, sentText: body, proofread: report ? summariseProofread(report) : null };
}

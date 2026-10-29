// "Ask Jarvis": the Owner types an instruction, Jarvis answers, suggests next steps, and — when an email is open —
// drafts a reply, or prepares an in-app message / calendar entry / task. The Owner's text is the only instruction source;
// records are data (see ai.mjs).
// Nothing here sends or does anything: drafts and actions are returned for the Owner to read and confirm
// (sendOwnerReply below sends a reply; actions.mjs carries out an action).

import { abandonSend, beginSend, finishSend, noteAsk } from "./audit.mjs";
import { askAi, chooseRecords, friendlyAiError } from "./ai.mjs";
import { basicCommand, loadCommandContext } from "./basic.mjs";
import { cleanPending } from "./commands.mjs";
import { loadTasks } from "./lookups.mjs";
import { ADVICE_QUESTION, DISPUTE_QUESTION, disputePlaybook } from "./playbook.mjs";
import { createReader } from "./readonly-db.mjs";
import { notConnectedText, offlineText, parseBrain, parseMode, resolveBrain } from "./brains.mjs";
import { suggestForItem } from "./advisor.mjs";
import { clip, looseSearch } from "./briefing.mjs";
import { checkDraft } from "./draft-guard.mjs";
import { melbourneDate, runJarvis } from "./jarvis.mjs";
import { FA, isolate, persianWhen, wantsPersian } from "./persian.mjs";
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
  const brain = parseBrain(body.brain);
  if (brain === null) throw new JarvisAccessError("Choose Jarvis 1 or Jarvis 2.", 400);
  const mode = parseMode(body.mode);
  if (mode === null) throw new JarvisAccessError("Choose Online or Offline.", 400);
  const useOtherRecords = body.useOtherRecords === true;
  const currentDraft = typeof body.currentDraft === "string" ? clipText(body.currentDraft, MAX_REPLY_CHARS) : "";
  // What Jarvis already understood of a command it asked a question about (see basic.mjs). Only ever used to fill in blanks; everything is checked again.
  const pending = cleanPending(body.pending);
  return { message, history, focus, brain, offline: mode === "offline", useOtherRecords, currentDraft, pending, hours: boundedInteger(body.hours, LIMITS.defaultHours, 1, LIMITS.maxHours, "hours") };
}

export function templateReply({ fromName, text, ownerName, company }) {
  const first = firstName(fromName);
  const signature = ownerName ? `${ownerName}\n${company}` : company;
  return clipText(`Hi${first ? ` ${first}` : ""},\n\n${text.trim()}\n\nKind regards,\n${signature}`, MAX_REPLY_CHARS);
}

const NEWS_QUESTION = /\b(news|what(?:'s| is| has| have)?\s+(?:new|happened|happening|going on)|anything new|any updates?|updates?|catch me up|brief me|bring me up to speed|khabar|akhbar)\b|خبر|اخبار|چه شده|اتفاق/i;
const PLANS_QUESTION = /\b(plans?|planned|upcoming|coming up|schedule|calendar|agenda|tomorrow|next week|this week|programme|program|barname|taghvim)\b|برنامه|تقویم|فردا|پیش رو|آینده|این هفته|هفته بعد/i;
// Things the rules can answer without an AI are looked up; things they cannot do are said plainly instead of being answered with an unrelated list.
const GREETING = /^\s*(?:hi|hello|hey|good (?:morning|afternoon|evening)|salam|salaam|سلام|درود)[\s!.,،؟?]*$/i;
const THANKS = /^\s*(?:thanks|thank you|thx|cheers|great|ok|okay|cool|merci|ممنون|مرسی|متشکرم|تشکر|باشه|خوبه)[\s!.,،؟?]*$/i;
const CANNOT = /^\s*(?:please\s+)?(?:delete|erase|wipe|destroy|remove|drop)\b|\bignore\b[^.?]*\b(?:rules|instructions|above|previous)\b|^\s*(?:please\s+)?email (?:everyone|all)\b|پاک کن|حذف کن|نادیده بگیر|^\s*(?:please\s+)?(?:call|phone|ring|dial|e-?mail)\b|\b(?:passwords?|passcode|team code|api key)\b|\b(?:change|reset|grant|revoke|give|make|promote|demote)\b[^.?]*\b(?:role|permission|access|admin rights?|an admin|the owner)\b|\b(?:approve|reject|hire|fire|sack|suspend|deactivate)\b[^.?]*\b(?:staff|workers?|members?|users?|accounts?)\b|^\s*(?:please\s+)?(?:undo|revert|unsend|take (?:that|it) back)\b|رمز|پسورد|کد تیم/i;
// What each kind of "I can't" says, so the Owner hears WHY and what to do instead (the general sentence is the fallback).
const CANNOT_REASONS = [
  [/^\s*(?:please\s+)?(?:call|phone|ring|dial|e-?mail)\b(?!\s+(?:everyone|all)\b)/i, "I can't make phone calls or start an email. I can send an in-app message to a team member, put something in the calendar, give a task, or write a reply to an email you open in Jarvis.", "من نمی‌توانم تماس بگیرم یا ایمیل تازه بفرستم. می‌توانم برای یکی از تیم پیام داخل برنامه بفرستم، چیزی را در تقویم بگذارم، تسک بدهم، یا جواب ایمیلی را که در Jarvis باز کرده‌اید بنویسم."],
  [/\b(?:passwords?|passcode|team code|api key)\b|رمز|پسورد|کد تیم|\b(?:change|reset|grant|revoke|give|make|promote|demote)\b[^.?]*\b(?:role|permission|access|admin rights?|an admin|the owner)\b|\b(?:approve|reject|hire|fire|sack|suspend|deactivate)\b[^.?]*\b(?:staff|workers?|members?|users?|accounts?)\b/i, "I can't see or change passwords, the Team Code, roles or anyone's access, and I can't approve or remove staff. Do that on the Team pages.", "من رمزها، کد تیم، نقش‌ها و دسترسی‌ها را نمی‌بینم و عوض نمی‌کنم. این کار را در صفحه‌های تیم انجام دهید."],
  [/^\s*(?:please\s+)?(?:undo|revert|unsend|take (?:that|it) back)\b/i, "I can't undo something that has already been done. Change or remove it on its own page (Tasks, Schedule, Finance or the team chat).", "نمی‌توانم کاری را که انجام شده برگردانم. آن را در صفحه‌ی خودش (تسک‌ها، برنامه، مالی یا چت تیم) عوض یا حذف کنید."],
];
const cannotReply = (message, persian) => { const hit = CANNOT_REASONS.find(([pattern]) => pattern.test(message)); return hit ? hit[persian ? 2 : 1] : null; };
const HELP_QUESTION = /^\s*(?:help|help me|what can you do|what do you do|what are you able to do|how do (?:i|you) use (?:you|this)|how does this work|commands|examples|options|کمک|راهنما|راهنمایی|چه کار(?:هایی)? می ?کنی|چه کاری می ?توانی)[\s?.!؟]*$/i;
// "cancel" with nothing waiting: said plainly instead of searching the records for the word "cancel".
const CANCEL_NOTHING = /^\s*(?:cancel(?: that| it)?|never ?mind|forget it|stop|skip(?: it)?|no|nope|ولش کن|بیخیال|لغو|کنسل|نه)[\s.!]*$/i;
const ACTION = /^\s*(?:please\s+)?(?:tell|message|text|remind|notify)\b(?!\s+(?:me|us)\b)|\b(?:add|put|create|make|set up|book|schedule)\b[^?]*\b(?:calendar|diary|task|reminder|appointment)\b|\b(?:give|assign)\b[^?]*\btask\b|\bsend\b[^?]*\b(?:message|text)\b|بگو|بگذار|بساز|بنویس|بفرست|یادآوری کن|اضافه کن|ثبت کن|پیام بده|خبر بده|اطلاع بده/i;
// "What should I do first?" / "any complaints?": the quick buttons. Only these are answered with the list of what needs attention when nothing matches.
const PRIORITY_QUESTION = /\b(first|plate|urgent|urgently|priority|priorities|prioriti[sz]e|attention|important|should i|need to handle|need to do|to do|todo|complaints?|problems?|issues?|risks?|overdue|late|waiting|stuck|behind)\b|اول|فوری|مهم|اولویت|توجه|شکایت|مشکل|چه کار|چی کار|عقب/i;
// What basic mode (no AI) understands. Said whenever a sentence is not one of those, so the Owner is never left with "I can't".
const EXAMPLE_LINES_EN = `• set a task for Ali: check the tiles on the Smith job
• tell Ben to be on site at 7 tomorrow · tell the whole team the site is closed Friday
• put the council inspection in Sue's calendar on Friday at 1pm · remind me to renew the licence
• enter an expense of $320 for tiles on ATP-2026-00124
• what tasks does Ali have? · how is the money? · how much did we spend on materials? · how is the Smith kitchen?
• what projects do we have? · who is on the team?
• what's the news? · what is coming up tomorrow?
You can also press “Prepare by hand” under the command line. Connect an AI brain for anything more open-ended.`;
const BASIC_EXAMPLES_EN = `I didn't understand that as a command. Without an AI I understand sentences like:\n${EXAMPLE_LINES_EN}`;
const HELP_EN = `Here is what I can do, even without an AI:\n${EXAMPLE_LINES_EN}\nNothing is done until you press the button on a card.`;
// A sentence that is clearly something else (news, plans, hello, thanks) is never taken for the answer to a question Jarvis asked.
// (Plans words such as "tomorrow" or "calendar" are NOT counted here: they are exactly what the Owner says when asked "which day?".)
const isOtherIntent = (text) => NEWS_QUESTION.test(text) || GREETING.test(text) || THANKS.test(text) || CANNOT.test(text);
const isNewsOrPlans = (text) => NEWS_QUESTION.test(text) || PLANS_QUESTION.test(text);
const SOURCE_HEADING = { company_email: "Email", employee_updates: "Reports", client_comments: "Clients", team_messages: "Team messages", work: "Requests and projects", tasks: "Tasks", finance: "Money", people: "Team" };
const dayLabel = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const whenText = (iso) => { const date = new Date(iso); return Number.isNaN(date.getTime()) ? iso : dayLabel.format(date); };

// "What's the news?" without the AI: what happened, newest first, kept together by area. Only said when the Owner asked.
export function newsText(items, { perArea = 4, persian = false } = {}) {
  const areas = new Map();
  for (const item of items) {
    if (item.kind === "message_from_owner") continue; // the Owner's own words are not news to the Owner
    const list = areas.get(item.source) ?? [];
    if (list.length < perArea) list.push(item);
    areas.set(item.source, list);
  }
  if (persian) {
    // Each record is isolated, so English words in a Persian line (and the other way round) cannot reorder the sentence.
    // The preview goes on its own line, not isolated, so an English preview reads left to right and a Persian one right to left.
    return [...areas].map(([source, list]) => `${FA.areas[source] ?? source}:\n${list.map((item) => `• ${persianWhen(item.at)} — ${isolate(item.title)}${item.who && !item.title.includes(item.who) ? ` (${isolate(item.who.replace(/<[^>]*>/g, ""))})` : ""}${item.preview ? `\n${clip(item.preview, 140)}` : ""}`).join("\n")}`).join("\n\n");
  }
  return [...areas].map(([source, list]) => `${SOURCE_HEADING[source] ?? source}:\n${list.map((item) => `• ${whenText(item.at)} — ${item.title}${item.who && !item.title.includes(item.who) ? ` (${item.who.replace(/<[^>]*>/g, "").trim()})` : ""}${item.preview ? `: ${clip(item.preview, 140)}` : ""}`).join("\n")}`).join("\n\n");
}

// A plan's title starts with "2026-10-27 09:00 — "; it is turned into the day as a person says it ("Tue 27 Oct, 9:00") so it reads (and is read aloud) naturally.
const planDay = { en: new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }), fa: new Intl.DateTimeFormat("fa-u-ca-gregory-nu-latn", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }) };
function planWhen(title, persian) {
  const match = String(title ?? "").match(/^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))? — ([\s\S]*)$/);
  const stamp = match ? new Date(`${match[1]}T12:00:00Z`) : null;
  if (!match || Number.isNaN(stamp.getTime())) return { when: "", rest: String(title ?? "") };
  return { when: `${planDay[persian ? "fa" : "en"].format(stamp)}${match[2] ? `, ${match[2]}` : ""}`, rest: match[3] };
}
export function plansText(plans, max = 12, { persian = false } = {}) {
  return plans.slice(0, max).map((plan) => {
    const { when, rest } = planWhen(plan.title, persian);
    if (persian) return `• ${when ? `${when} — ` : ""}${isolate(rest)}${plan.who ? ` — ${isolate(plan.who)}` : ""}${plan.project ? ` [${plan.project}]` : ""}`;
    return `• ${when ? `${when} — ` : ""}${rest}${plan.who ? ` — ${plan.who}` : ""}${plan.project ? ` [${plan.project}]` : ""}`;
  }).join("\n");
}

// "the last 3 days": every "nothing found" answer says which period was searched, so an empty answer is not mistaken for "nothing ever happened".
export function periodText(hours, persian = false) {
  const h = Number(hours) || 72;
  if (persian) return h <= 24 ? FA.periods.day : h % 24 === 0 ? FA.periods.days(h / 24) : FA.periods.hours(h);
  return h <= 24 ? "the last 24 hours" : h % 24 === 0 ? `the last ${h / 24} days` : `the last ${h} hours`;
}

const incompleteNote = (labels, persian) => persian
  ? FA.incomplete(labels.join(FA.and))
  : `Note: I could not fully read ${labels.join(" and ")}, so this answer may be incomplete.`;

function suggestionsFor(items, max = 6) {
  const out = [];
  for (const item of items) {
    const [first] = suggestForItem(item);
    if (first) out.push({ title: clip(item.title, 140), why: first.text, action: first.action, itemId: item.id });
    if (out.length >= max) break;
  }
  return out;
}

// "today", "tomorrow", "this week", "next week" in a plans question narrow the list to that day or week (Monday to Sunday). No such word: no narrowing.
function planWindow(message, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const shift = (days) => new Date(Date.parse(`${today}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const monday = shift(-((weekday + 6) % 7));
  const text = String(message ?? "").toLowerCase();
  const next = (/\bnext week\b|هفته (?:بعد|آینده)/.test(text));
  if (next) return { from: new Date(Date.parse(`${monday}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10), to: new Date(Date.parse(`${monday}T00:00:00Z`) + 13 * 86_400_000).toISOString().slice(0, 10), en: "next week", fa: "هفته‌ی بعد" };
  if (/\bthis week\b|این هفته/.test(text)) return { from: today, to: new Date(Date.parse(`${monday}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10), en: "this week", fa: "این هفته" };
  if (/\btomorrow\b|فردا/.test(text)) return { from: shift(1), to: shift(1), en: "tomorrow", fa: "فردا" };
  if (/\btoday\b|امروز/.test(text)) return { from: today, to: today, en: "today", fa: "امروز" };
  return null;
}

// What Jarvis can do without AI: format the Owner's own words into a reply, or point at the matching records.
// `reply` is ONLY the answer: it is what is read aloud and copied. Anything about the mode (basic, offline, not connected) goes in `notice`,
// which the screen shows in small print and which is never spoken.
function rulesAnswer({ message, items, plans = [], preview, owner, company, notice, incomplete = "", failedOpen = false, persian = false, hours = 72, today = "" }) {
  const note = notice || (persian ? FA.basicNote : "Basic mode: no AI is connected, so I searched your records.");
  if (preview) {
    return {
      reply: persian ? FA.basicPreviewTail : "I have put your words into a reply. Please read it, change anything you want, then press Send.",
      notice: note,
      suggestions: [],
      draft: { body: templateReply({ fromName: preview.toName || preview.original.from?.name, text: message, ownerName: owner.name, company }), note: "Written from your exact words — nothing was added." },
    };
  }
  if (failedOpen) {
    return { reply: persian ? FA.couldNotRead : "I did NOT write your reply, because I could not read that email. Please try again in a moment.", notice: notice || "", suggestions: [], draft: null };
  }
  const period = periodText(hours, persian);
  const say = (reply) => ({ reply, notice: note, suggestions: [], draft: null });
  if (CANNOT.test(message)) return say(cannotReply(message, persian) ?? (persian ? FA.cannot : "I can't do that. I can read the app, give you the news and prepare messages, calendar entries and tasks for you to confirm. I never delete or change records, money or access."));
  if (HELP_QUESTION.test(message)) return say(persian ? FA.help : HELP_EN);
  if (CANCEL_NOTHING.test(message)) return say(persian ? FA.nothingWaiting : "Okay. Nothing is waiting for you.");
  if (ACTION.test(message)) return say(persian ? FA.needsAi : BASIC_EXAMPLES_EN);
  if (THANKS.test(message)) return say(persian ? FA.thanks : "You're welcome.");
  if (GREETING.test(message)) return say(persian ? FA.hello : "Hello. Ask me for the news or what is coming up, or name a client or a project and I will look.");
  if (PLANS_QUESTION.test(message) && !NEWS_QUESTION.test(message)) {
    // "what is on tomorrow?" is answered with tomorrow's plans, not the next three weeks.
    const window = planWindow(message, today);
    const shown = window ? plans.filter((plan) => { const day = /^(\d{4}-\d{2}-\d{2})/.exec(String(plan.title ?? ""))?.[1] ?? ""; return day >= window.from && day <= window.to; }) : plans;
    const header = persian ? (window ? FA.plansHeaderFor(window.fa) : FA.plansHeader) : `This is what is planned${window ? ` ${window.en}` : ""}, soonest first:`;
    const none = persian ? (window ? FA.plansNoneFor(window.fa) : FA.plansNone(LIMITS.planDays)) : (window ? `Nothing is planned ${window.en}.` : `Nothing is planned in the next ${LIMITS.planDays} days.`);
    return { reply: `${shown.length ? `${header}\n${plansText(shown, 12, { persian })}` : none}${incomplete ? `\n\n${incomplete}` : ""}`, notice: note, suggestions: [], draft: null };
  }
  if (NEWS_QUESTION.test(message)) {
    const news = newsText(items, { persian });
    const header = persian ? FA.newsHeader : "Here is what has happened, newest first:";
    const none = persian ? FA.noNews(period) : `Nothing new has happened in ${period}.`;
    return {
      reply: `${news ? `${header}\n\n${news}` : none}${incomplete ? `\n\n${incomplete}` : ""}`,
      notice: note,
      suggestions: suggestionsFor(items.filter((item) => item.urgent)),
      draft: null,
    };
  }
  const matches = looseSearch(items, message);
  if (DISPUTE_QUESTION.test(message)) {
    const related = matches.slice(0, 4);
    const lines = related.map((item) => (persian ? `• ${isolate(item.title)}${item.who ? ` — ${isolate(item.who.replace(/<[^>]*>/g, ""))}` : ""}` : `• ${item.title}${item.who ? ` — ${item.who.replace(/<[^>]*>/g, "").trim()}` : ""}`));
    const head = related.length ? `${persian ? FA.matches : "These records look related:"}\n${lines.join("\n")}\n\n` : "";
    return { reply: `${head}${disputePlaybook(persian)}${incomplete ? `\n\n${incomplete}` : ""}`, notice: note, suggestions: suggestionsFor(related), draft: null };
  }
  // A question the rules cannot read is not answered with an unrelated list: Jarvis says what basic mode can do.
  if (!matches.length && ADVICE_QUESTION.test(message)) {
    return say(persian ? `${FA.adviceNeedsAi}\n${FA.needsAi}` : `Ideas and advice are what the AI brain is for: it reads your records and thinks the situation through with you. Connect Jarvis 1 or Jarvis 2 for that.\n${BASIC_EXAMPLES_EN}`);
  }
  if (!matches.length && !PRIORITY_QUESTION.test(message)) {
    return say(persian ? FA.lookupOnly(period) : `I found nothing about that in ${period}.\n${BASIC_EXAMPLES_EN}`);
  }
  const chosen = (matches.length ? matches : items.filter((item) => item.urgent)).slice(0, 6);
  const lines = chosen.map((item) => (persian
    ? `• ${isolate(item.title)}${item.who ? ` — ${isolate(item.who.replace(/<[^>]*>/g, ""))}` : ""}`
    : `• ${item.title}${item.who ? ` — ${item.who.replace(/<[^>]*>/g, "").trim()}` : ""}`));
  const matchHeader = persian ? (matches.length ? FA.matches : FA.attention) : `${matches.length ? "These match" : "These need your attention"}:`;
  return {
    reply: `${chosen.length
      ? `${matchHeader}\n${lines.join("\n")}`
      : persian ? FA.noMatch(period) : `I found nothing matching in ${period}.`}${incomplete ? `\n\n${incomplete}` : ""}`,
    notice: note,
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
  // Least privilege: while drafting a reply the AI sees this email plus records of the SAME email thread - nothing else, unless the
  // Owner ticks "use other records". Unrelated customers' comments, staff reports and the other mailboxes are the exfiltration/injection channel.
  // Only records of the SAME email thread count as related. (A project code mentioned in the email's own text is not proof: anyone can
  // write another customer's project code into an email to pull that customer's records into the draft.)
  const isRelated = (item) => !original || item.email?.threadId === original.threadId;
  const usable = input.useOtherRecords ? items : items.filter(isRelated);
  const withheld = items.length - usable.length;
  const today = melbourneDate(now);
  const persian = wantsPersian(input.message);
  // The real projects and finance categories: they tie "the Smith kitchen" to a project code for the rules, and they are what the AI may choose from.
  const commandContext = input.focus ? { projects: [], categories: [] } : await loadCommandContext(db);
  // The Owner picks the brain (Jarvis 1 = Claude, Jarvis 2 = OpenJarvis); everything else below is identical for both.
  const brain = resolveBrain(config, input.brain, { testClient: ai?.client ?? null, fetchImpl, offline: input.offline === true });
  // Plans are other people's calendar text; while drafting an email they stay out of the AI's view unless the Owner ticked "use other records".
  const plans = original && !input.useOtherRecords ? [] : briefing.plans;
  if (brain.enabled && !openProblem) {
    // The Owner's own messages to the team are not news to the Owner (basic mode already leaves them out): when the Owner asks for the news they stay out of the AI's view too.
    const forAi = NEWS_QUESTION.test(input.message) ? usable.filter((item) => item.kind !== "message_from_owner") : usable;
    const records = chooseRecords(forAi);
    // The AI sees every open task and every project's money (not only what changed lately), so it can answer "who is behind?" and "how are we doing?" — but not while an email is being answered.
    const openTasks = original ? [] : await loadTasks(createReader(db), { open: true }).catch(() => []);
    try {
      const answer = await askAi({
        client: brain.client,
        model: brain.model,
        ownerName: owner.name, company,
        // While drafting a reply, earlier Jarvis answers (news about other clients and staff) stay out: only the Owner's own words carry over.
        message: input.message, history: original ? input.history.filter((turn) => turn.role === "owner") : input.history, records, hours: input.hours,
        focus: original ? { mailbox: account.label, fromName: preview?.toName || original.from?.name || "", subject: original.subject, text: original.text, cut: original.textCut } : null,
        canDraft: Boolean(preview),
        sourceStatus: Object.fromEntries(Object.entries(briefing.sources).map(([name, report]) => [name, report.status])),
        totalRecords: items.length - (usable.length - forAi.length),
        currentDraft: preview ? input.currentDraft : "",
        plans, people, today, ownerEmail: owner.email,
        projects: original ? [] : commandContext.projects, openTasks,
        itemIds: new Set([...records.map((item) => item.id), ...(focusId ? [focusId] : [])]),
        useFallbacks: brain.fallbacks,
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
    ? incompleteNote(briefing.briefing.incomplete.map((entry) => (persian ? FA.areas[entry.scope] ?? entry.label : entry.label)), persian) : "";
  // A brain the Owner picked but that is not connected is never swapped for the other one: Jarvis says so and uses basic mode.
  const chosenButOff = !brain.enabled && Boolean(input.brain);
  if (brain.offline && !notice) notice = persian ? FA.offline(brain.name) : offlineText(brain);
  else if (chosenButOff && !notice) notice = persian ? FA.notConnected(brain.name, brain.engine) : notConnectedText(brain);
  const rulesNotice = brain.enabled || openProblem || replyProblem || chosenButOff || brain.offline ? notice : "";
  // Without an AI (or when it could not answer) the sentence is read by fixed rules first: tasks, messages, calendar entries and money entries are
  // prepared for the Owner's button, and tasks, money and projects are read straight from the database. Only then the news / plans / search answers.
  if (!outcome && !input.focus && !CANNOT.test(input.message)) {
    try {
      const command = await basicCommand({ db, message: input.message, people, owner, today, pending: input.pending, isOtherIntent, isNewsOrPlans, ...commandContext });
      if (command) outcome = { mode: "rules", reply: command.reply, notice: rulesNotice || (command.persian ? FA.basicRulesNote : "Basic mode: no AI is connected, so I read your sentence with fixed rules."), suggestions: [], draft: null, actions: command.actions, pending: command.pending };
    } catch (error) {
      console.error("Jarvis could not read the command:", error instanceof Error ? error.name : "unknown");
    }
  }
  if (!outcome) outcome = { mode: "rules", ...rulesAnswer({ message: input.message, items, plans: briefing.plans, preview, owner, company, notice: rulesNotice, incomplete, failedOpen: Boolean(input.focus) && !preview && !replyProblem, persian, hours: input.hours, today }) };
  else if (incomplete && outcome.mode === "ai") outcome.reply = `${outcome.reply}\n\n${incomplete}`;

  // While an email is open, records outside its thread are kept from the AI. Say so, so "nothing else is new" is not taken to mean "nothing happened".
  if (original && !input.useOtherRecords && withheld > 0 && outcome.mode === "ai" && !outcome.draft) {
    outcome.reply = `${outcome.reply}\n\n(${withheld} other record${withheld === 1 ? " is" : "s are"} kept out while this email is open. Close the email, or tick “use other records”, to include ${withheld === 1 ? "it" : "them"}.)`.trim();
  }
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
    brain: outcome.mode === "ai" ? { id: brain.id, name: brain.name, engine: brain.engine } : null,
    offline: brain.offline,
    notice: outcome.mode === "rules" ? (outcome.notice ?? notice) : "",
    pending: outcome.pending ?? null,
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
  const chosen = parseBrain(input.brain);
  if (chosen === null) throw new JarvisAccessError("Choose Jarvis 1 or Jarvis 2.", 400);
  const mode = parseMode(input.mode);
  if (mode === null) throw new JarvisAccessError("Choose Online or Offline.", 400);
  const brain = resolveBrain(config, chosen, { testClient: ai?.client ?? null, fetchImpl, offline: mode === "offline" });
  // Three AI calls are about to be made, so this counts against the same question limit as asking does.
  if (brain.enabled && input.proofread !== false) await noteAsk(db, owner.email, now);
  const report = input.proofread === false ? null : await proofread(typed, { client: brain.enabled ? brain.client : null, model: brain.model, maxChars: MAX_REPLY_CHARS });
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

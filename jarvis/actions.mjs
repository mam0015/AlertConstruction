// What Jarvis can DO inside the app for the Owner: send an in-app message to a person, put something in the calendar,
// give someone a task, record an income or expense on a project. It never does any of these on its own.
//
//   1. The AI (or the Owner's own form) PROPOSES an action. validateProposal() checks it against the real team list and the
//      calendar rules and returns a clean, complete description. Nothing has happened yet.
//   2. The Owner reads it on screen and presses the button. Only then performAction() runs, with the Owner's own identity,
//      through the same stores the rest of the app uses (so every normal rule still applies), exactly once, and it is logged.
//
// The people, the date rules and the way each action is carried out are passed in, so this file stays free of database code.

import { abandonAction, beginAction, finishAction, noteAsk } from "./audit.mjs";
import { proofread } from "./proofread.mjs";
import { JarvisAccessError } from "./policy.mjs";
import { niceName } from "./commands.mjs";
import { clipText, oneLine, sha256Hex } from "./text.mjs";

export const ACTION_TYPES = Object.freeze(["send_message", "add_calendar", "create_task", "add_finance"]);
export const FINANCE_TYPES = Object.freeze(["Income", "Outcome"]);
export const GENERAL_PROJECT = "Business / General";
const MAX_CENTS = 10_000_000_000; // $100,000,000 — the same ceiling as the finance form
export const PRIORITIES = Object.freeze(["Normal", "High", "Urgent"]);
export const MAX_ACTIONS = 5;
const ACTION_ID = /^[A-Za-z0-9-]{8,64}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MESSAGE_CHARS = 2000;
const TEAM_CHANNEL = "*"; // the team chat's "everyone" channel — the same value the chat store uses

export const TYPE_LABEL = Object.freeze({ send_message: "Message", add_calendar: "Calendar", create_task: "Task", add_finance: "Money" });

function isRealDate(value) {
  if (!DATE.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

function addDays(date, days) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

const dollars = (cents) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100);
const WEEKDAY = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short" });
const dayWithWeekday = (date) => `${WEEKDAY.format(new Date(`${date}T12:00:00Z`))} ${date}`;

// "9:30", "9.30am", "9pm" and "09:30" are all a time of day. "" means no time was given; null means something was given that is not a time.
function normalTime(value) {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!text) return "";
  const match = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/.exec(text);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (match[3]) { if (hour < 1 || hour > 12) return null; hour = hour % 12 + (match[3] === "pm" ? 12 : 0); }
  else if (match[2] === undefined) return null; // a bare "9" is not clear enough
  const out = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return TIME.test(out) ? out : null;
}

// A finance entry belongs to a real project (or to the business in general); it is never about a person, so it has no recipient.
function validateFinance(raw, { projects, today, makeId }) {
  const financeType = FINANCE_TYPES.includes(raw.financeType) ? raw.financeType : "";
  if (!financeType) return { problem: "The money entry must be Income or an Expense." };
  const category = oneLine(raw.category ?? "", 80);
  if (!category) return { problem: "The money entry needs a category (for example Materials)." };
  const amountCents = Number(raw.amountCents);
  if (!Number.isInteger(amountCents) || amountCents < 1 || amountCents > MAX_CENTS) return { problem: "The amount must be more than zero and under $100,000,000." };
  const entryDate = typeof raw.entryDate === "string" && raw.entryDate.trim() ? raw.entryDate.trim() : today;
  if (!isRealDate(entryDate)) return { problem: "The date of the money entry is not a real date." };
  if (entryDate > addDays(today, 30)) return { problem: "A money entry cannot be dated more than 30 days ahead." };
  if (entryDate < addDays(today, -1100)) return { problem: "A money entry cannot be dated more than 3 years back." };
  const code = oneLine(raw.projectCode ?? "", 80) || GENERAL_PROJECT;
  const known = Array.isArray(projects) ? projects : null;
  const project = code === GENERAL_PROJECT ? null : known?.find((entry) => entry.code === code);
  if (code !== GENERAL_PROJECT && !project) return { problem: known ? `There is no project with the code ${code.slice(0, 40)}.` : "Projects are not available right now, so the money entry cannot be checked." };
  const projectName = project ? (project.name || project.customer || project.code) : "the business in general";
  const id = typeof raw.id === "string" && ACTION_ID.test(raw.id) ? raw.id : makeId();
  return {
    action: {
      id, type: "add_finance", personEmail: "", personName: "", personRole: "", title: category, text: clipText(raw.text ?? "", 500), dates: [entryDate], startTime: "",
      projectCode: code, priority: "Normal", financeType, category, amountCents, entryDate, projectName,
    },
  };
}

// `people` is the approved team list ({ email, name, role }); `projects` the real projects ({ code, name, customer }); `today` is the Melbourne date (YYYY-MM-DD); `ownerEmail` is the Owner.
// Returns { action } when the proposal is usable, or { problem } saying in plain words what is wrong.
export function validateProposal(raw, { people = [], projects, today, ownerEmail = "", makeId = () => crypto.randomUUID() }) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { problem: "That is not a valid action." };
  const type = raw.type;
  if (!ACTION_TYPES.includes(type)) return { problem: "Jarvis does not know that kind of action." };
  if (type === "add_finance") return validateFinance(raw, { projects, today, makeId });

  const email = oneLine(raw.person ?? raw.personEmail ?? "", 200).toLowerCase();
  // Only a message may go to the whole team; a task or a calendar entry always belongs to one real person.
  const person = type === "send_message" && email === TEAM_CHANNEL ? { email: TEAM_CHANNEL, name: "The whole team", role: "Team" } : people.find((entry) => entry.email.toLowerCase() === email);
  if (!person) return { problem: "That person is not an approved member of the team." };
  if (type === "send_message" && person.email.toLowerCase() === String(ownerEmail).toLowerCase()) return { problem: "A message cannot be sent to yourself." };

  const title = clipText(raw.title, 160);
  const text = clipText(raw.text, type === "send_message" ? MESSAGE_CHARS : 1000);
  const id = typeof raw.id === "string" && ACTION_ID.test(raw.id) ? raw.id : makeId();
  const base = { id, type, personEmail: person.email.toLowerCase(), personName: person.email === TEAM_CHANNEL ? person.name : oneLine(niceName(person), 120), personRole: oneLine(person.role, 40) };

  if (type === "send_message") {
    if (text.length < 2) return { problem: "The message is empty." };
    return { action: { ...base, title: "", text, dates: [], startTime: "", projectCode: "", priority: "Normal" } };
  }

  const projectCode = oneLine(raw.projectCode ?? "", 60);
  // A code the AI made up is caught here, before the Owner is shown a card for a project that does not exist.
  if (projectCode && projectCode !== GENERAL_PROJECT && Array.isArray(projects) && projects.length && !projects.some((entry) => entry.code === projectCode)) {
    return { problem: `There is no project with the code ${projectCode.slice(0, 40)}.` };
  }
  if (type === "create_task") {
    // A task can only be given on a project that is running; the task store refuses the rest, so say so before the card is shown.
    const chosen = projectCode && Array.isArray(projects) ? projects.find((entry) => entry.code === projectCode) : null;
    if (chosen && chosen.active === false) return { problem: `${projectCode.slice(0, 40)} is not an active project, so it cannot be given a task.` };
    if (!title) return { problem: "The task needs a title." };
    if (!text) return { problem: "The task needs instructions." };
    const priority = PRIORITIES.includes(raw.priority) ? raw.priority : "Normal";
    return { action: { ...base, title, text, dates: [], startTime: "", projectCode, priority } };
  }

  // add_calendar
  if (!title) return { problem: "The calendar entry needs a title." };
  const dates = [...new Set((Array.isArray(raw.dates) ? raw.dates : []).map((value) => String(value).trim()))];
  if (dates.length === 0) return { problem: "The calendar entry needs at least one date." };
  if (dates.length > 31) return { problem: "A calendar entry can cover at most 31 days at a time." };
  if (dates.some((value) => !isRealDate(value))) return { problem: "One of the dates is not a real date." };
  if (dates.some((value) => value < today)) return { problem: "A calendar entry cannot be in the past." };
  if (dates.some((value) => value > addDays(today, 730))) return { problem: "That date is too far ahead." };
  // A time that is not a real time of day (such as 25:00) is refused, never quietly turned into "all day".
  const startTime = normalTime(raw.startTime);
  if (startTime === null) return { problem: "The start time is not a real time of day." };
  return { action: { ...base, title, text, dates: dates.sort(), startTime, projectCode, priority: "Normal" } };
}

// A one-line plain description of what pressing the button will do, built by Jarvis (never by the AI).
export function describeAction(action) {
  if (action.type === "add_finance") {
    const what = action.financeType === "Income" ? "income" : "an expense";
    return `Record ${what} of ${dollars(action.amountCents)} (${action.category}) for ${action.projectName || action.projectCode}${action.projectCode === GENERAL_PROJECT ? "" : ` (${action.projectCode})`}, dated ${dayWithWeekday(action.entryDate)}${action.text ? `. Note: ${action.text}` : ""}.`;
  }
  const who = action.personName || action.personEmail;
  if (action.type === "send_message") return action.personEmail === TEAM_CHANNEL ? "Send an in-app message to the whole team (the team chat)." : `Send an in-app message to ${who}.`;
  if (action.type === "create_task") {
    const priority = action.priority.toLowerCase();
    return `Give ${who} ${/^[aeiou]/.test(priority) ? "an" : "a"} ${priority}-priority task: ${action.title}.`;
  }
  const when = action.dates.length === 1 ? dayWithWeekday(action.dates[0]) : `${action.dates.length} days (${action.dates[0]} to ${action.dates.at(-1)})`;
  return `Add “${action.title}” to the calendar of ${who} on ${when}${action.startTime ? ` at ${action.startTime}` : ""}.`;
}

// Takes what the AI proposed and keeps what is valid. `dropped` says what could not be prepared, so the Owner is never left guessing.
export function validateProposals(list, context) {
  const actions = [];
  const dropped = [];
  for (const raw of (Array.isArray(list) ? list : []).slice(0, MAX_ACTIONS)) {
    const result = validateProposal(raw, context);
    if (result.action) actions.push({ ...result.action, summary: describeAction(result.action) });
    else dropped.push(result.problem);
  }
  return { actions, dropped };
}

// ---------- Carrying it out (Owner pressed the button) ----------

// `executors` carry the action out through the app's own stores:
//   sendMessage({ personEmail, text }), addCalendar({ personEmail, title, notes, dates, startTime, projectCode }),
//   createTask({ personEmail, title, instructions, priority, projectCode }),
//   addFinance({ financeType, category, projectCode, amountCents, entryDate, note })
export async function performAction({ db, owner, input, people, projects, today, executors, proofreadWith = /** @type {{ client?: any, model?: string }} */ ({}), now = Date.now() }) {
  if (!input || typeof input !== "object" || input.confirm !== true) throw new JarvisAccessError("Confirm before Jarvis does this.", 400);
  if (typeof input.id !== "string" || !ACTION_ID.test(input.id)) throw new JarvisAccessError("That action is not valid. Ask Jarvis again.", 400);
  const checked = validateProposal(input.action ?? input, { people, projects, today, ownerEmail: owner.email, makeId: () => input.id });
  if (!checked.action) throw new JarvisAccessError(checked.problem, 400);
  const action = { ...checked.action, id: input.id };

  // Messages are people-facing writing, so they get the same three proofreading passes as an email.
  let report = null;
  if (action.type === "send_message") {
    // Three AI calls when a brain is connected: they count against the question limit.
    if (proofreadWith.client) await noteAsk(db, owner.email, now);
    report = await proofread(action.text, { ...proofreadWith, maxChars: MESSAGE_CHARS });
    action.text = report.text;
  }

  const claim = await beginAction(db, {
    ownerEmail: owner.email, actionId: action.id, type: action.type, recipient: action.type === "add_finance" ? action.projectCode : action.personEmail, title: action.title || (action.type === "send_message" ? "Message" : ""),
    bodySha256: await sha256Hex(`${action.title}\n${action.text}\n${action.dates.join(",")}\n${action.startTime}\n${action.financeType ?? ""}\n${action.amountCents ?? ""}`), bodyChars: action.text.length,
  }, now);
  try {
    if (action.type === "add_finance") await executors.addFinance({ financeType: action.financeType, category: action.category, projectCode: action.projectCode, amountCents: action.amountCents, entryDate: action.entryDate, note: action.text });
    else if (action.type === "send_message") await executors.sendMessage({ personEmail: action.personEmail, text: action.text });
    else if (action.type === "create_task") await executors.createTask({ personEmail: action.personEmail, title: action.title, instructions: action.text, priority: action.priority, projectCode: action.projectCode });
    else await executors.addCalendar({ personEmail: action.personEmail, title: action.title, notes: action.text, dates: action.dates, startTime: action.startTime, projectCode: action.projectCode });
  } catch (error) {
    await abandonAction(db, claim).catch(() => undefined);
    // The stores explain themselves in plain words ("Choose an active project…"); anything else is a generic failure.
    if (error instanceof Error && error.name !== "TypeError" && error.message && error.message.length < 200 && !/d1_|sqlite|sql|constraint|binding|undefined|null/i.test(error.message)) throw new JarvisAccessError(error.message, 400);
    console.error("Jarvis action failed:", error instanceof Error ? error.name : "unknown");
    throw new JarvisAccessError("Jarvis could not do that just now. Nothing was changed. Please try again.", 503);
  }
  await finishAction(db, claim).catch((error) => console.error("Jarvis could not record an action:", error instanceof Error ? error.name : "unknown"));
  return { ok: true, id: action.id, type: action.type, summary: describeAction(action), proofread: report };
}

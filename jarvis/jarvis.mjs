// Jarvis orchestrator: reads the Owner-permitted sources (the whole working app, never its secrets) and returns the news —
// what happened, newest first — plus what is planned ahead and suggested next steps.
// Nothing here writes anything. The caller (app/api/owner/jarvis/route.ts) has already proved the request is the Owner.

import { buildTopics, withSuggestions } from "./advisor.mjs";
import { buildBriefing, searchItems, sortNewestFirst } from "./briefing.mjs";
import { assertScope, JARVIS_AUDIENCE, JARVIS_MODE, LIMITS, parseOptions } from "./policy.mjs";
import { createReader } from "./readonly-db.mjs";
import { readClientComments } from "./sources/client-comments.mjs";
import { parseAccounts, readCompanyEmail } from "./sources/company-email.mjs";
import { readEmployeeUpdates } from "./sources/employee-updates.mjs";
import { readFinance } from "./sources/finance.mjs";
import { readPeople } from "./sources/people.mjs";
import { readSchedule } from "./sources/schedule.mjs";
import { readTasks } from "./sources/tasks.mjs";
import { readTeamMessages } from "./sources/team-messages.mjs";
import { readWork } from "./sources/work.mjs";

// Each mailbox costs 2 requests (login + list) plus one per message, and a Cloudflare Worker on the free plan may make 50 per
// request. Fewer messages per mailbox when there are several keeps one briefing (and one question) comfortably inside that.
export function emailCap(config) {
  const mailboxes = Math.max(1, parseAccounts(config?.accounts).length);
  return Math.max(5, Math.min(20, Math.floor((40 - 2 * mailboxes) / mailboxes)));
}

const SOURCE_LABEL = {
  company_email: "company email", employee_updates: "employee updates", client_comments: "client comments", team_messages: "team messages",
  work: "requests and projects", tasks: "tasks", schedule: "the schedule", finance: "finance", people: "the team list",
};

const DATABASE_READERS = {
  employee_updates: readEmployeeUpdates, client_comments: readClientComments, team_messages: readTeamMessages,
  work: readWork, tasks: readTasks, schedule: readSchedule, finance: readFinance, people: readPeople,
};

// "Today" and "in N days" as Melbourne calendar dates (the business runs on Melbourne time, whatever the server clock says).
export function melbourneDate(ms) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

async function readScope(scope, context) {
  assertScope(scope);
  if (scope === "company_email") {
    const result = await readCompanyEmail({
      config: context.config,
      sinceMs: context.sinceMs,
      limit: Math.min(context.options.limit, emailCap(context.config)),
      fetchImpl: context.fetchImpl,
    });
    return { status: result.status, items: result.items, accounts: result.accounts };
  }
  const reader = createReader(context.db);
  const window = {
    sinceISO: context.sinceISO, limit: context.options.limit, ownerEmail: context.ownerEmail,
    fromDate: context.fromDate, toDate: context.toDate,
  };
  return DATABASE_READERS[scope](reader, window);
}

export async function runJarvis({ db, config = {}, fetchImpl = globalThis.fetch, params, ownerEmail = "", now = Date.now() }) {
  const options = parseOptions(params);
  const sinceMs = now - options.hours * 3_600_000;
  const context = {
    db, config, fetchImpl, options, sinceMs, sinceISO: new Date(sinceMs).toISOString(), ownerEmail,
    fromDate: melbourneDate(now), toDate: melbourneDate(now + LIMITS.planDays * 86_400_000),
  };

  const sources = {};
  const collected = [];
  await Promise.all(options.scopes.map(async (scope) => {
    try {
      const result = await readScope(scope, context);
      sources[scope] = { status: result.status, count: result.items.length, ...(result.accounts ? { mailboxes: result.accounts } : {}) };
      collected.push(...result.items);
    } catch (error) {
      if (error?.name === "JarvisAccessError" && error.status < 500) throw error;
      console.error(`Jarvis could not read ${scope}:`, error instanceof Error ? error.name : "unknown error");
      sources[scope] = { status: "error", count: 0 };
    }
  }));

  // The schedule looks ahead, so it is kept apart from "what happened" and listed soonest first.
  const planned = searchItems(collected.filter((item) => item.source === "schedule"), options.query)
    .sort((a, b) => (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0));
  const matching = sortNewestFirst(searchItems(collected.filter((item) => item.source !== "schedule"), options.query));
  const briefing = buildBriefing(matching, { hours: options.hours });
  briefing.topics = buildTopics(matching);
  briefing.plans = { count: planned.length, from: context.fromDate, to: context.toDate };
  // A source that could not be read must never look like "nothing happened".
  const trouble = Object.entries(sources).filter(([, report]) => report.status === "error" || report.status === "partial")
    .map(([scope, report]) => ({ scope, label: SOURCE_LABEL[scope] ?? scope, status: report.status }));
  if (trouble.length) {
    briefing.incomplete = trouble;
    const names = trouble.map((entry) => entry.label).join(" and ");
    briefing.headline = matching.length === 0
      ? `I could not read ${names} just now, so I cannot tell you whether anything is new.`
      : `${briefing.headline} I could not fully read ${names}, so this may be incomplete.`;
  }
  return {
    generatedAt: new Date(now).toISOString(),
    audience: JARVIS_AUDIENCE,
    mode: JARVIS_MODE,
    window: { hours: options.hours, since: context.sinceISO },
    query: options.query,
    scopes: options.scopes,
    sources,
    briefing,
    items: matching.slice(0, Math.min(options.limit, LIMITS.maxLimit)).map(withSuggestions),
    plans: planned.slice(0, 40),
  };
}

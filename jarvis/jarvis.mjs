// Jarvis orchestrator: reads the three permitted sources for the Owner and returns a briefing with suggested next steps.
// Nothing here writes anything. The caller (app/api/owner/jarvis/route.ts) has already proved the request is the Owner.

import { buildTopics, withSuggestions } from "./advisor.mjs";
import { buildBriefing, searchItems, sortNewestFirst } from "./briefing.mjs";
import { assertScope, JARVIS_AUDIENCE, JARVIS_MODE, LIMITS, parseOptions } from "./policy.mjs";
import { createReader } from "./readonly-db.mjs";
import { readClientComments } from "./sources/client-comments.mjs";
import { readCompanyEmail } from "./sources/company-email.mjs";
import { readEmployeeUpdates } from "./sources/employee-updates.mjs";

const EMAIL_PER_MAILBOX_CAP = 20; // keeps one briefing inside Cloudflare's per-request subrequest limit

async function readScope(scope, context) {
  assertScope(scope);
  if (scope === "company_email") {
    const result = await readCompanyEmail({
      config: context.config,
      sinceMs: context.sinceMs,
      limit: Math.min(context.options.limit, EMAIL_PER_MAILBOX_CAP),
      fetchImpl: context.fetchImpl,
    });
    return { status: result.status, items: result.items, accounts: result.accounts };
  }
  const reader = createReader(context.db);
  const window = { sinceISO: context.sinceISO, limit: context.options.limit };
  return scope === "employee_updates" ? readEmployeeUpdates(reader, window) : readClientComments(reader, window);
}

export async function runJarvis({ db, config = {}, fetchImpl = globalThis.fetch, params, now = Date.now() }) {
  const options = parseOptions(params);
  const sinceMs = now - options.hours * 3_600_000;
  const context = { db, config, fetchImpl, options, sinceMs, sinceISO: new Date(sinceMs).toISOString() };

  const sources = {};
  const collected = [];
  await Promise.all(options.scopes.map(async (scope) => {
    try {
      const result = await readScope(scope, context);
      sources[scope] = { status: result.status, count: result.items.length, ...(result.accounts ? { mailboxes: result.accounts } : {}) };
      collected.push(...result.items);
    } catch (error) {
      if (error?.name === "JarvisAccessError" && error.status < 500) throw error;
      console.error(`Jarvis could not read ${scope}:`, error instanceof Error ? error.message : error);
      sources[scope] = { status: "error", count: 0 };
    }
  }));

  const matching = sortNewestFirst(searchItems(collected, options.query));
  const briefing = buildBriefing(matching, { hours: options.hours });
  briefing.topics = buildTopics(matching);
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
  };
}

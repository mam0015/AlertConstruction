// Jarvis access policy — the single place that says what Jarvis may see and do.
//
// Jarvis is the Owner's private assistant and manager. It can READ the whole working app, through these sources:
//   company_email     – the company mailboxes the Owner has connected (Gmail)
//   employee_updates  – the reports employees submit (end-of-day, worker, supervisor, site visit, site issue)
//   client_comments   – messages customers send about their request or project
//   team_messages     – what the team writes to the Owner and in the team channel (workers, admin, manager, estimator ...)
//   work              – requests, projects, stage changes, inspections and change proposals
//   tasks             – tasks and follow-ups given to people
//   schedule          – the calendar and the schedule: what is planned, including what is coming up
//   finance           – income and expense entries and each project's contract value and balance
//   people            – who is on the team, their role and when they were last on site
//
// It NEVER reads secrets: passwords and password hashes, sign-in sessions, Team Codes, PINs, API keys, the Owner account
// itself and customers' contact hashes are not on the allow-list (readonly-db.mjs refuses any query that names them).
//
// It takes instructions only from the Owner. It tells the Owner what happened only when the Owner asks. It advises, and
// it can draft an email reply from what the Owner tells it to say — but it sends a reply only when the Owner presses
// Send on that draft, and only back to the person who wrote the original email (reply.mjs). It can also prepare an
// in-app message, a calendar entry or a task for the Owner to confirm (actions.mjs). It never deletes anything.
// Anything not listed here is refused.

export class JarvisAccessError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = "JarvisAccessError";
    this.status = status;
  }
}

export const JARVIS_AUDIENCE = "owner";
export const JARVIS_MODE = "read-only";
export const JARVIS_SCOPES = Object.freeze(["company_email", "employee_updates", "client_comments", "team_messages", "work", "tasks", "schedule", "finance", "people"]);

export const LIMITS = Object.freeze({
  defaultHours: 72,
  maxHours: 24 * 30,
  defaultLimit: 60,
  maxLimit: 200,
  maxQueryChars: 120,
  planDays: 21, // how far ahead "upcoming plans" looks
  previewChars: 280,
});

export function assertScope(scope) {
  if (!JARVIS_SCOPES.includes(scope)) throw new JarvisAccessError(`Jarvis has no access to "${String(scope).slice(0, 40)}".`);
  return scope;
}

export function boundedInteger(value, fallback, min, max, label) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new JarvisAccessError(`${label} must be a whole number from ${min} to ${max}.`, 400);
  }
  return number;
}

// Turns the request's query string into validated options. Unknown scopes are an error, never silently ignored,
// so a typo can't look like "Jarvis checked it and found nothing".
export function parseOptions(params) {
  const get = (name) => (typeof params?.get === "function" ? params.get(name) : params?.[name] ?? null);
  const rawScopes = get("scopes");
  const scopes = rawScopes
    ? [...new Set(String(rawScopes).split(",").map((item) => item.trim()).filter(Boolean))].map((scope) => {
        if (!JARVIS_SCOPES.includes(scope)) throw new JarvisAccessError(`Jarvis has no access to "${scope.slice(0, 40)}".`, 400);
        return scope;
      })
    : [...JARVIS_SCOPES];
  if (scopes.length === 0) throw new JarvisAccessError("Choose at least one source.", 400);
  const query = String(get("q") ?? "").trim().slice(0, LIMITS.maxQueryChars);
  return {
    scopes,
    hours: boundedInteger(get("hours"), LIMITS.defaultHours, 1, LIMITS.maxHours, "hours"),
    limit: boundedInteger(get("limit"), LIMITS.defaultLimit, 1, LIMITS.maxLimit, "limit"),
    query,
  };
}

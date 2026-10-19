// Jarvis access policy — the single place that says what Jarvis may see.
//
// Jarvis is the Owner's private assistant. It can READ exactly three things and nothing else:
//   1. company_email      – the company mailboxes the Owner has connected (Gmail, read-only scope)
//   2. employee_updates   – the reports/updates employees submit (end-of-day, worker, supervisor, site visit, site issue)
//   3. client_comments    – messages customers send about their request or project
//
// It never writes, never sends, never deletes, and never touches finance, passwords, sessions, staff
// access, team chat or customer contact details. Anything not listed here is refused.

export class JarvisAccessError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = "JarvisAccessError";
    this.status = status;
  }
}

export const JARVIS_AUDIENCE = "owner";
export const JARVIS_MODE = "read-only";
export const JARVIS_SCOPES = Object.freeze(["company_email", "employee_updates", "client_comments"]);

export const LIMITS = Object.freeze({
  defaultHours: 72,
  maxHours: 24 * 30,
  defaultLimit: 60,
  maxLimit: 200,
  maxQueryChars: 120,
  previewChars: 280,
});

export function assertScope(scope) {
  if (!JARVIS_SCOPES.includes(scope)) throw new JarvisAccessError(`Jarvis has no access to "${String(scope).slice(0, 40)}".`);
  return scope;
}

function boundedInteger(value, fallback, min, max, label) {
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

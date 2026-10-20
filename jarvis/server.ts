import { ownerDisplayName, ownerSessionFromRequest, requestIsSameOrigin } from "../app/owner-auth";
import { JarvisAccessError } from "./policy.mjs";

// Shared plumbing for the /api/owner/jarvis routes: the Owner-only gate, JSON reading with a size cap, and error mapping.

export const headers = { "Cache-Control": "no-store" };

// Test seam (same idea as __ATP_TEST_BINDINGS__ in db/runtime.ts): the end-to-end tests swap the network for fakes.
type Hooks = { fetchImpl?: typeof fetch; aiClient?: unknown };
export function hooks(): Hooks {
  return (globalThis as { __JARVIS_TEST_HOOKS__?: Hooks }).__JARVIS_TEST_HOOKS__ ?? {};
}

export function networkFetch(): typeof fetch {
  // Every call to Google gets a time limit, so one stalled mailbox cannot hang the whole briefing.
  return hooks().fetchImpl ?? ((input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15_000) }));
}

// Everything Jarvis is configured with comes from private Worker secrets — never from GitHub.
export function jarvisConfig() {
  return {
    clientId: process.env.JARVIS_GMAIL_CLIENT_ID?.trim(),
    clientSecret: process.env.JARVIS_GMAIL_CLIENT_SECRET?.trim(),
    accounts: process.env.JARVIS_GMAIL_ACCOUNTS,
    apiKey: process.env.JARVIS_ANTHROPIC_API_KEY?.trim(),
    aiMode: process.env.JARVIS_AI?.trim(),
    model: process.env.JARVIS_AI_MODEL?.trim(),
    aiFallbacks: process.env.JARVIS_AI_FALLBACKS?.trim().toLowerCase(),
    company: process.env.JARVIS_COMPANY_NAME?.trim(),
    // Jarvis 2: OpenJarvis running on the Owner's own computer or server.
    openJarvis: {
      url: process.env.JARVIS_OPENJARVIS_URL?.trim(),
      apiKey: process.env.JARVIS_OPENJARVIS_API_KEY?.trim(),
      model: process.env.JARVIS_OPENJARVIS_MODEL?.trim(),
      accessId: process.env.JARVIS_OPENJARVIS_ACCESS_ID?.trim(),
      accessSecret: process.env.JARVIS_OPENJARVIS_ACCESS_SECRET?.trim(),
    },
  };
}

export const notAllowed = (allow: string) => () => Response.json({ error: "That method is not allowed here." }, { status: 405, headers: { ...headers, Allow: allow } });

// Only the Owner session passes. Requests that change something must also come from this site (CSRF guard).
export async function requireOwner(request: Request, { write }: { write: boolean }) {
  if (write && !requestIsSameOrigin(request)) return { response: Response.json({ error: "Request blocked." }, { status: 403, headers }) };
  const session = await ownerSessionFromRequest(request);
  if (!session) return { response: Response.json({ error: "Owner sign-in required." }, { status: 401, headers }) };
  return { owner: { email: session.email, name: await ownerDisplayName(session.email) } };
}

export async function readJson(request: Request, maxBytes = 30_000): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw new JarvisAccessError("That request is too large.", 413);
  const text = await request.text();
  if (text.length > maxBytes) throw new JarvisAccessError("That request is too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new JarvisAccessError("Send the request as JSON.", 400);
  }
}

export function fail(error: unknown, fallback: string) {
  const status = (error as { status?: number })?.status;
  if (error instanceof JarvisAccessError && typeof status === "number") {
    return Response.json({ error: error.message }, { status, headers });
  }
  console.error("Jarvis failed:", error instanceof Error ? error.name : "unknown error", (error as { status?: number })?.status ?? "");
  return Response.json({ error: fallback }, { status: 503, headers });
}

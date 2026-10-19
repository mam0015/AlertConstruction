import { runtimeBindings } from "../../../../db/runtime";
import { runJarvis } from "../../../../jarvis/jarvis.mjs";
import { ownerSessionFromRequest } from "../../../owner-auth";

// Jarvis is the Owner's read-only assistant. Only the Owner session may call it (Admin, Team and Customer sessions are
// refused), and only GET exists — there is no endpoint that can change, send or delete anything.
const headers = { "Cache-Control": "no-store" };
const notAllowed = () => Response.json({ error: "Jarvis is read-only." }, { status: 405, headers: { ...headers, Allow: "GET" } });

export async function GET(request: Request) {
  const session = await ownerSessionFromRequest(request);
  if (!session) return Response.json({ error: "Owner sign-in required." }, { status: 401, headers });
  try {
    const env = await runtimeBindings();
    const result = await runJarvis({
      db: env.DB,
      params: new URL(request.url).searchParams,
      config: {
        clientId: process.env.JARVIS_GMAIL_CLIENT_ID?.trim(),
        clientSecret: process.env.JARVIS_GMAIL_CLIENT_SECRET?.trim(),
        accounts: process.env.JARVIS_GMAIL_ACCOUNTS,
      },
    });
    // Audit line (no content): who asked, what Jarvis was allowed to read, how much it returned.
    console.info(JSON.stringify({ jarvis: "read", owner: session.email, scopes: result.scopes, items: result.items.length }));
    return Response.json(result, { headers });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (typeof status === "number" && status >= 400 && status < 500) return Response.json({ error: (error as Error).message }, { status, headers });
    console.error("Jarvis failed:", error instanceof Error ? error.message : error);
    return Response.json({ error: "Jarvis could not read the company records right now." }, { status: 503, headers });
  }
}

export const POST = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;

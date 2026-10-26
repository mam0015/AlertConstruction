import { estimateActor } from "../../../estimate-tools/access";
import { STARTER_PRICES } from "../../../../db/estimate-starter";

// The prices the older tools carried, offered to the Owner and Admin as a starting point for the company price list. The screen fills them in as
// unsaved changes; nothing is stored until a person presses Save prices. They are not part of any page or script a browser downloads.
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const actor = await estimateActor(request);
  if (!actor) return Response.json({ error: "Sign in to use the estimate tools." }, { status: 401, headers });
  if (!actor.canEdit) return Response.json({ error: "Only the Owner and Admin can load starting prices." }, { status: 403, headers });
  return Response.json({ prices: STARTER_PRICES }, { headers });
}

const notAllowed = () => Response.json({ error: "That method is not allowed here." }, { status: 405, headers: { ...headers, Allow: "GET" } });
export const POST = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;

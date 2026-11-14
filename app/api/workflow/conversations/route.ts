import { adminSessionFromRequest } from "../../../admin-auth";
import { ownerSessionFromRequest } from "../../../owner-auth";
import { getCustomerConversations } from "../../../../db/workflow-store";

// Every customer conversation, read-only, for the Owner, Admin and Manager (the Manager is the Owner's right hand and reads them;
// Owner and Admin reply from the project board). Never includes a customer's private code.
export async function GET(request: Request) {
  const owner = await ownerSessionFromRequest(request);
  const staff = owner ? null : await adminSessionFromRequest(request);
  if (!owner && staff?.role !== "Admin" && staff?.role !== "Manager") return Response.json({ error: "Owner, Admin or Manager sign-in required." }, { status: 401 });
  try {
    return Response.json({ data: await getCustomerConversations(owner ? "owner" : staff?.role === "Admin" ? "admin" : "manager") }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    // An Admin whose project access the Owner switched off.
    if ((error as { status?: number })?.status === 403) return Response.json({ error: (error as Error).message }, { status: 403 });
    throw error;
  }
}

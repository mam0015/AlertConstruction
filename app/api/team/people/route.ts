import { teamIdentityFromRequest } from "../../../team-identity";
import { listPeople, listProjectCodes } from "../../../../db/team-store";

export async function GET(request: Request) {
  const me = await teamIdentityFromRequest(request);
  if (!me) return Response.json({ error: "Team sign-in required." }, { status: 401 });
  const [people, projects] = await Promise.all([listPeople(), listProjectCodes()]);
  return Response.json({ data: { me, people, projects } }, { headers: { "Cache-Control": "no-store" } });
}

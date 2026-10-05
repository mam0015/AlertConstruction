import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleHome, teamIdentityFromCookies } from "../../team-identity";
import TeamHub from "./TeamHub";

export const dynamic = "force-dynamic";

export default async function TeamHubPage() {
  const me = await teamIdentityFromCookies(await cookies());
  if (!me) redirect("/#team-sign-in");
  return <TeamHub me={me} home={roleHome(me.role)} />;
}

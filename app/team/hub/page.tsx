import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleHome, teamIdentityFromCookies } from "../../team-identity";
import TeamHub from "./TeamHub";

// Private area: its own tab title, and never listed by search engines.
export const metadata = { title: "Calendar & messages", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function TeamHubPage() {
  const me = await teamIdentityFromCookies(await cookies());
  if (!me) redirect("/#team-sign-in");
  return <TeamHub me={me} home={roleHome(me.role)} />;
}

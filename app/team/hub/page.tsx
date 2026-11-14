import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { roleHome, teamIdentityFromCookies } from "../../team-identity";
import TeamHub from "./TeamHub";

// Private area: its own tab title, and never listed by search engines.
export const metadata = { title: "Calendar & messages", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function TeamHubPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const me = await teamIdentityFromCookies(await cookies());
  if (!me) redirect("/#team-sign-in");
  // A link can open a section directly (for example the Site Supervisor's "Daily report" and "Team messages").
  const wanted = (await searchParams).tab;
  const initialTab = wanted === "messages" || (wanted === "report" && me.role !== "Owner") ? wanted : "calendar";
  return <TeamHub me={me} home={roleHome(me.role)} initialTab={initialTab} />;
}

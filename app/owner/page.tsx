import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import OwnerDashboard from "./OwnerDashboard";
import { ownerCookieName, ownerDisplayName, verifyOwnerSession } from "../owner-auth";

export const dynamic = "force-dynamic";

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const params = await searchParams;
  if (process.env.NODE_ENV === "development" && params.preview === "operation-hub") {
    return <OwnerDashboard ownerName="Owner Preview" ownerEmail="owner.preview@example.invalid" />;
  }
  const cookieStore = await cookies();
  const session = await verifyOwnerSession(cookieStore.get(ownerCookieName())?.value);
  if (!session) redirect("/#team-sign-in");
  return <OwnerDashboard ownerName={await ownerDisplayName(session.email)} ownerEmail={session.email} />;
}

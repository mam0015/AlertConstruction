import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pendingStaffCookieName, verifyPendingStaffSession } from "../../admin-auth";
import PendingAccess from "./PendingAccess";

export const dynamic = "force-dynamic";

export default async function PendingStaffPage() {
  const cookieStore = await cookies();
  const pending = await verifyPendingStaffSession(cookieStore.get(pendingStaffCookieName())?.value);
  if (!pending) redirect("/");
  return <PendingAccess email={pending.email} />;
}

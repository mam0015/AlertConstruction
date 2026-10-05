import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StaffShell from "../team/StaffShell";
import TaskInbox from "../tasks/TaskInbox";
import { adminCookieName, verifyAdminSession } from "../admin-auth";
import { ownerCookieName, verifyOwnerSession } from "../owner-auth";
import ManagerOverview from "./ManagerOverview";

export const dynamic = "force-dynamic";

export default async function ManagerPage() {
  const store = await cookies();
  const owner = await verifyOwnerSession(store.get(ownerCookieName())?.value);
  const staff = await verifyAdminSession(store.get(adminCookieName())?.value);
  if (!owner && staff?.role !== "Manager") redirect("/#team-sign-in");
  return <StaffShell title="Manager workspace" subtitle={owner ? "Owner view" : staff?.email ?? ""} role={owner ? "Owner" : "Staff"}>
    <ManagerOverview />
    {staff && <TaskInbox role="Manager" />}
  </StaffShell>;
}

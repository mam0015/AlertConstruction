import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StaffShell from "../team/StaffShell";
import WorkflowBoard from "../workflow/WorkflowBoard";
import { adminCookieName, verifyAdminSession } from "../admin-auth";
import { ownerCookieName, verifyOwnerSession } from "../owner-auth";

export const dynamic = "force-dynamic";

export default async function EstimatorPage() {
  const store = await cookies();
  const owner = await verifyOwnerSession(store.get(ownerCookieName())?.value);
  const staff = await verifyAdminSession(store.get(adminCookieName())?.value);
  if (!owner && staff?.role !== "Estimator") redirect("/#team-sign-in");
  return <StaffShell title="Estimator workspace" subtitle={owner ? "Owner view" : staff?.email ?? ""} role={owner ? "Owner" : "Staff"}>
    <WorkflowBoard role="estimator" />
  </StaffShell>;
}

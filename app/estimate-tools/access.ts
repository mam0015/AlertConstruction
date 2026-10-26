import { adminSessionFromRequest } from "../admin-auth";
import { ownerSessionFromRequest } from "../owner-auth";

// Who may use the estimate tools. The Owner and the Admin can read and change the company price list; the Manager and the Estimator can read it
// and use it. Nobody else (customers, the other trades) can see it: it is what the work costs the company.
export type EstimateActor = { email: string; role: "Owner" | "Admin" | "Manager" | "Estimator"; canEdit: boolean };

export async function estimateActor(request: Request): Promise<EstimateActor | null> {
  const owner = await ownerSessionFromRequest(request);
  if (owner) return { email: owner.email, role: "Owner", canEdit: true };
  const staff = await adminSessionFromRequest(request);
  if (staff?.role === "Admin") return { email: staff.email, role: "Admin", canEdit: true };
  if (staff?.role === "Manager" || staff?.role === "Estimator") return { email: staff.email, role: staff.role, canEdit: false };
  return null;
}

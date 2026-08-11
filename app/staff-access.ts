import { hashStaffPassword, registeredAdminEmail, type StaffRole, verifyAdminCredentials, verifyCompanyTeamCode, verifyStoredSecret } from "./admin-auth";
import { createStaffAccessRequest, getStaffAccessRequest, touchStaffAccessRequest } from "../db/staff-store";

export type StaffSignInResult =
  | { status: "pending"; email: string }
  | { status: "approved"; email: string; role: StaffRole; tradeTitle: string }
  | { status: "rejected"; email: string }
  | { status: "invalid" };

export function staffRedirect(role: StaffRole) {
  return role === "Admin" ? "/admin" : "/team/workspace";
}

export async function processStaffSignIn(emailInput: string, password: string, teamCode: string): Promise<StaffSignInResult> {
  const email = emailInput.trim().toLowerCase();
  if (!email || !password || !teamCode || !await verifyCompanyTeamCode(teamCode)) return { status: "invalid" };

  // This is the single Owner-created bootstrap Admin account. Its secrets live
  // only in the hosted environment; all other staff still require Owner review.
  if (email === registeredAdminEmail() && await verifyAdminCredentials(password, teamCode)) {
    return { status: "approved", email, role: "Admin", tradeTitle: "Primary Admin" };
  }

  const existing = await getStaffAccessRequest(email);

  if (!existing) {
    await createStaffAccessRequest(email, await hashStaffPassword(password));
    return { status: "pending", email };
  }

  if (!await verifyStoredSecret(password, existing.passwordHash)) return { status: "invalid" };
  await touchStaffAccessRequest(email);
  if (existing.status === "Rejected") return { status: "rejected", email };
  if (existing.status !== "Approved" || existing.role === "Unassigned") return { status: "pending", email };
  return { status: "approved", email, role: existing.role, tradeTitle: existing.tradeTitle };
}

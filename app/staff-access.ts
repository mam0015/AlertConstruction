import { hashStaffPassword, type StaffRole, verifyCompanyTeamCode, verifyStoredSecret } from "./admin-auth";
import { isRegisteredOwnerEmail } from "./owner-auth";
import { createStaffAccessRequest, getStaffAccessRequest, touchStaffAccessRequest } from "../db/staff-store";
import { notifyOwnerOfStaffRequest } from "./team-access-notification";

export type StaffSignInResult =
  | { status: "pending"; email: string }
  | { status: "approved"; email: string; role: StaffRole; tradeTitle: string }
  | { status: "rejected"; email: string }
  | { status: "weak" }
  | { status: "invalid" };

export function staffRedirect(role: StaffRole) {
  if (role === "Admin") return "/admin";
  if (role === "Site Supervisor") return "/site-supervisor";
  if (role === "Estimator") return "/estimator";
  if (role === "Manager") return "/manager";
  if (isWorkerRole(role)) return "/worker";
  return "/team/workspace";
}

export const workerStaffRoles: StaffRole[] = ["Worker", "Electrician", "Plumber", "Cleaner", "Carpenter", "Plasterer", "Tiler"];
export function isWorkerRole(role: StaffRole | string): role is StaffRole {
  return workerStaffRoles.includes(role as StaffRole);
}

// A refused sign-in must take as long as a real password check, or the time it takes tells a stranger which e-mail addresses
// belong to staff (or to the Owner).
const SPENT_HASH = "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
async function invalidAfterCheck(password: string): Promise<StaffSignInResult> {
  await verifyStoredSecret(password, SPENT_HASH).catch(() => false);
  return { status: "invalid" };
}

export async function processStaffSignIn(emailInput: string, password: string, teamCode: string): Promise<StaffSignInResult> {
  const email = emailInput.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) return { status: "invalid" };
  if (await isRegisteredOwnerEmail(email)) return invalidAfterCheck(password);

  const existing = await getStaffAccessRequest(email);

  if (!existing) {
    if (!teamCode) return invalidAfterCheck(password);
    if (!await verifyCompanyTeamCode(teamCode)) return { status: "invalid" };
    // Only someone who already holds the Team Code is told about the password rule, so this reveals nothing to a stranger.
    if (password.length < 10) return { status: "weak" };
    await createStaffAccessRequest(email, await hashStaffPassword(password));
    await notifyOwnerOfStaffRequest(email).catch(() => undefined);
    return { status: "pending", email };
  }

  if (!await verifyStoredSecret(password, existing.passwordHash)) return { status: "invalid" };
  await touchStaffAccessRequest(email);
  if (existing.status === "Rejected") return { status: "rejected", email };
  if (existing.status !== "Approved" || existing.role === "Unassigned") return { status: "pending", email };
  return { status: "approved", email, role: existing.role, tradeTitle: existing.tradeTitle };
}

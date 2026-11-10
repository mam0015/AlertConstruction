import { hashStaffPassword, staffSessionProof, type StaffRole, type StaffSessionProof, verifyCompanyTeamCode, verifyStoredSecret } from "./admin-auth";
import { isRegisteredOwnerEmail } from "./owner-auth";
import { createStaffAccessRequest, getStaffAccessRequest, touchStaffAccessRequest } from "../db/staff-store";
import { notifyOwnerOfStaffRequest } from "./team-access-notification";

export type StaffSignInResult =
  | { status: "pending"; email: string; proof: StaffSessionProof }
  | { status: "approved"; email: string; role: StaffRole; tradeTitle: string; proof: StaffSessionProof }
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
  const checkedAt = Date.now();
  const email = emailInput.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) return { status: "invalid" };
  if (await isRegisteredOwnerEmail(email)) return invalidAfterCheck(password);

  const existing = await getStaffAccessRequest(email);

  if (!existing) {
    if (!teamCode) return invalidAfterCheck(password);
    if (!await verifyCompanyTeamCode(teamCode)) return { status: "invalid" };
    // Only someone who already holds the Team Code is told about the password rule, so this reveals nothing to a stranger.
    if (password.length < 10) return { status: "weak" };
    const passwordHash = await hashStaffPassword(password);
    // Someone else created this e-mail's request a moment ago: their password stands, and this attempt is simply a wrong sign-in.
    if (!await createStaffAccessRequest(email, passwordHash)) return { status: "invalid" };
    await notifyOwnerOfStaffRequest(email).catch(() => undefined);
    return { status: "pending", email, proof: await staffSessionProof(passwordHash, checkedAt) };
  }

  if (!await verifyStoredSecret(password, existing.passwordHash)) return { status: "invalid" };
  const proof = await staffSessionProof(existing.passwordHash, checkedAt);
  await touchStaffAccessRequest(email);
  if (existing.status === "Rejected") return { status: "rejected", email };
  if (existing.status !== "Approved" || existing.role === "Unassigned") return { status: "pending", email, proof };
  return { status: "approved", email, role: existing.role, tradeTitle: existing.tradeTitle, proof };
}

import { adminCookieName, adminSessionFromRequest, verifyAdminSession, type StaffRole } from "./admin-auth";
import { ownerCookieName, ownerDisplayName, ownerSessionFromRequest, verifyOwnerSession } from "./owner-auth";
import { getStaffAccessRequest } from "../db/staff-store";

export type TeamRole = StaffRole | "Owner";
export type TeamIdentity = { email: string; role: TeamRole; name: string };

export const managementRoles: TeamRole[] = ["Owner", "Admin", "Manager"];

export function roleHome(role: TeamRole) {
  if (role === "Owner") return "/owner";
  if (role === "Admin") return "/admin";
  if (role === "Manager") return "/manager";
  if (role === "Estimator") return "/estimator";
  if (role === "Site Supervisor") return "/site-supervisor";
  return "/worker";
}

export function staffName(email: string, tradeTitle: string, role: string) {
  const local = email.split("@")[0] ?? email;
  return `${local} · ${tradeTitle.trim() || role}`;
}

async function staffIdentity(session: { email: string; role: StaffRole } | null): Promise<TeamIdentity | null> {
  if (!session) return null;
  const record = await getStaffAccessRequest(session.email);
  return { email: session.email, role: session.role, name: staffName(session.email, record?.tradeTitle ?? "", session.role) };
}

export async function teamIdentityFromRequest(request: Request): Promise<TeamIdentity | null> {
  const owner = await ownerSessionFromRequest(request);
  if (owner) return { email: owner.email, role: "Owner", name: `${await ownerDisplayName(owner.email)} (Owner)` };
  return staffIdentity(await adminSessionFromRequest(request));
}

export async function teamIdentityFromCookies(cookies: { get(name: string): { value: string } | undefined }): Promise<TeamIdentity | null> {
  const owner = await verifyOwnerSession(cookies.get(ownerCookieName())?.value);
  if (owner) return { email: owner.email, role: "Owner", name: `${await ownerDisplayName(owner.email)} (Owner)` };
  return staffIdentity(await verifyAdminSession(cookies.get(adminCookieName())?.value));
}

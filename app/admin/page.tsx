import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminCookieName, verifyAdminSession } from "../admin-auth";
import { ownerCookieName, verifyOwnerSession } from "../owner-auth";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const params = await searchParams;
  if (process.env.NODE_ENV === "development" && params.preview === "operation-hub") {
    return <AdminDashboard viewerName="Admin Preview" viewerEmail="admin.preview@example.invalid" previewAsOwner={false} />;
  }
  const cookieStore = await cookies();
  const owner = await verifyOwnerSession(cookieStore.get(ownerCookieName())?.value);
  if (owner) return <AdminDashboard viewerName="Owner" viewerEmail={owner.email} previewAsOwner />;
  const admin = await verifyAdminSession(cookieStore.get(adminCookieName())?.value);
  if (!admin || admin.role !== "Admin") redirect("/#team-sign-in");
  return <AdminDashboard viewerName="Admin" viewerEmail={admin.email} previewAsOwner={false} />;
}

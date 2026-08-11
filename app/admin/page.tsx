import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSession } from "../admin-auth";
import { ownerCookieName, verifyOwnerSession } from "../owner-auth";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const params = await searchParams;
  if (process.env.NODE_ENV === "development" && params.preview === "operation-hub") {
    return <AdminDashboard viewerName="Admin Preview" viewerEmail="admin.preview@alerttradiepro.local" previewAsOwner={false} />;
  }
  const cookieStore = await cookies();
  const owner = await verifyOwnerSession(cookieStore.get(ownerCookieName())?.value);
  if (owner) return <AdminDashboard viewerName="Ali Mobini" viewerEmail={owner.email} previewAsOwner />;
  const admin = await verifyAdminSession(cookieStore.get(adminCookieName())?.value);
  if (!admin || admin.role !== "Admin") return <AdminLogin />;
  return <AdminDashboard viewerName="Admin 01" viewerEmail={admin.email} previewAsOwner={false} />;
}

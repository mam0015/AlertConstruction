import { cookies } from "next/headers";
import Link from "next/link";
import { adminCookieName, verifyAdminSession } from "../admin-auth";
import SiteSupervisor from "./SiteSupervisor";

export const dynamic = "force-dynamic";

export default async function SiteSupervisorPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const params = await searchParams;
  if (process.env.NODE_ENV === "development" && params.preview === "operation-hub") return <SiteSupervisor previewTasks />;

  const cookieStore = await cookies();
  const session = await verifyAdminSession(cookieStore.get(adminCookieName())?.value);
  if (session?.role === "Site Supervisor") return <SiteSupervisor />;

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#080909", color: "white", fontFamily: "Arial, sans-serif" }}>
    <section style={{ width: "min(620px, 100%)", padding: 42, border: "1px solid #303131", background: "#111212" }}>
      <p style={{ color: "#f5b900", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase" }}>Role-protected workspace</p>
      <h1 style={{ margin: "16px 0", fontSize: 42, letterSpacing: "-.045em" }}>Site Supervisor access</h1>
      <p style={{ color: "#a4a7a7", lineHeight: 1.7 }}>This workspace opens only after the Owner approves the Site Supervisor role. Sign in through Team Sign In to continue.</p>
      <Link href="/#team-sign-in" style={{ display: "inline-flex", minHeight: 44, alignItems: "center", marginTop: 18, padding: "0 18px", background: "#f5b900", color: "#080909", fontSize: 10, fontWeight: 800 }}>Return to Team Sign In</Link>
    </section>
  </main>;
}

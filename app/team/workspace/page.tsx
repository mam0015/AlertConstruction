import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import BrandLogo from "../../BrandLogo";
import { adminCookieName, verifyAdminSession } from "../../admin-auth";
import styles from "../team.module.css";

export const dynamic = "force-dynamic";

export default async function TeamWorkspacePage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(cookieStore.get(adminCookieName())?.value);
  if (!session) redirect("/");
  if (session.role === "Admin") redirect("/admin");
  return <main className={styles.teamShell}>
    <section className={styles.accessCard}>
      <BrandLogo kind="tradie" tone="dark" className={styles.teamLogo} />
      <div className={styles.statusMark}><span>✓</span></div>
      <p className={styles.eyebrow}>Access approved</p>
      <h1>{session.role} workspace assigned.</h1>
      <p>Your identity and role are active. The dedicated {session.role} tools will be built in the next role phase without changing your approved access.</p>
      <div className={styles.identityRow}><span>Approved account</span><strong>{session.email}</strong></div>
      <Link href="/">Return to public website</Link>
    </section>
  </main>;
}

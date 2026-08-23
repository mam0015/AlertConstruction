import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import BrandLogo from "../../BrandLogo";
import { adminCookieName, verifyAdminSession } from "../../admin-auth";
import { isWorkerRole } from "../../staff-access";
import TaskInbox from "../../tasks/TaskInbox";
import styles from "../team.module.css";

export const dynamic = "force-dynamic";

export default async function TeamWorkspacePage() {
  const cookieStore = await cookies();
  const session = await verifyAdminSession(cookieStore.get(adminCookieName())?.value);
  if (!session) redirect("/");
  if (session.role === "Admin") redirect("/admin");
  if (session.role === "Site Supervisor") redirect("/site-supervisor");
  if (isWorkerRole(session.role)) redirect("/worker");
  return <main className={styles.teamShell}>
    <section className={styles.accessCard}>
      <BrandLogo kind="tradie" tone="dark" className={styles.teamLogo} />
      <div className={styles.statusMark}><span>✓</span></div>
      <p className={styles.eyebrow}>Access approved</p>
      <h1>{session.role} workspace assigned.</h1>
      <p>Your identity and role are active. Tasks assigned to you by Owner appear below and can be started or completed from this workspace.</p>
      <div className={styles.identityRow}><span>Approved account</span><strong>{session.email}</strong></div>
      <TaskInbox role={session.role} />
      <Link href="/">Return to public website</Link>
    </section>
  </main>;
}

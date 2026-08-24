"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BrandLogo from "../../BrandLogo";
import styles from "../team.module.css";

export default function PendingAccess({ email, preview = false }: { email: string; preview?: boolean }) {
  const [status, setStatus] = useState<"Pending" | "Rejected">("Pending");

  useEffect(() => {
    if (preview) return;
    let active = true;
    async function check() {
      const response = await fetch("/api/staff/status", { cache: "no-store" });
      const result = await response.json().catch(() => ({})) as { status?: "Pending" | "Approved" | "Rejected"; redirect?: string };
      if (!active) return;
      if (result.status === "Approved" && result.redirect) {
        window.location.href = result.redirect;
      } else if (result.status === "Rejected") setStatus("Rejected");
    }
    void check();
    const timer = window.setInterval(check, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [preview]);

  return <main className={styles.teamShell}>
    <section className={styles.accessCard}>
      <BrandLogo kind="tradie" tone="dark" className={styles.teamLogo} />
      <div className={styles.statusMark}><span>{status === "Pending" ? "···" : "×"}</span></div>
      <p className={styles.eyebrow}>Staff access control</p>
      <h1>{status === "Pending" ? "Owner approval in progress." : "Access was not approved."}</h1>
      <p>{status === "Pending" ? "Your secure access request was received. The Owner must assign your role and approve access before your workspace opens." : "The Owner has reviewed this request. Please contact the Owner if your role or details need to be corrected."}</p>
      <div className={styles.identityRow}><span>Request email</span><strong>{email}</strong></div>
      {status === "Pending" && <div className={styles.progressRow}><i /><span>This page checks automatically. You do not need to sign in again.</span></div>}
      <Link href="/">Return to public website</Link>
    </section>
  </main>;
}

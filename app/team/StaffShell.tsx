"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "../BrandLogo";
import styles from "./hub/team-hub.module.css";

export default function StaffShell({ title, subtitle, role, children }: { title: string; subtitle: string; role: "Owner" | "Staff"; children: ReactNode }) {
  async function signOut() {
    await fetch(role === "Owner" ? "/api/owner/logout" : "/api/admin/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  }
  return <main className={styles.shell}>
    <header className={styles.top}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/" aria-label="Alert Tradie Pro home"><BrandLogo kind="tradie" tone="dark" /></Link>
        <div><h1>{title}</h1><small>{subtitle}</small></div>
      </div>
      <div className={styles.topLinks}>
        <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/team/hub">Calendar &amp; messages</Link>
        <button className={styles.btn} onClick={() => void signOut()}>Sign out</button>
      </div>
    </header>
    <div className={styles.body}>{children}</div>
  </main>;
}

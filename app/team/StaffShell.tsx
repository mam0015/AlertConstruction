"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import BrandLogo from "../BrandLogo";
import styles from "./hub/team-hub.module.css";
import { requestSignOut } from "./sign-out";

export default function StaffShell({ title, subtitle, role, children }: { title: string; subtitle: string; role: "Owner" | "Staff"; children: ReactNode }) {
  const [signOutError, setSignOutError] = useState("");
  async function signOut() {
    setSignOutError("");
    const problem = await requestSignOut(role === "Owner" ? "/api/owner/logout" : "/api/admin/logout");
    if (problem) setSignOutError(problem);
    else window.location.href = "/";
  }
  return <main className={styles.shell}>
    <header className={styles.top}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", minWidth: 0 }}>
        <Link href="/" aria-label="Alert Tradie Pro home"><BrandLogo kind="tradie" tone="dark" /></Link>
        <div style={{ minWidth: 0, overflowWrap: "anywhere" }}><h1>{title}</h1><small>{subtitle}</small></div>
      </div>
      <div className={styles.topLinks}>
        <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/team/hub">Calendar &amp; messages</Link>
        <button className={styles.btn} onClick={() => void signOut()}>Sign out</button>
      </div>
    </header>
    {signOutError && <p className={styles.error} role="alert">{signOutError}</p>}
    <div className={styles.body}>{children}</div>
  </main>;
}

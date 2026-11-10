"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "../../BrandLogo";
import styles from "../team.module.css";
import { requestSignOut } from "../sign-out";

export default function PendingAccess({ email, preview = false }: { email: string; preview?: boolean }) {
  const [status, setStatus] = useState<"Pending" | "Rejected" | "Ended">("Pending");

  const [signOutError, setSignOutError] = useState("");
  const signingOut = useRef(false);

  // On a shared computer the waiting cookie must not turn into this person's workspace for whoever opens the page after approval.
  // The page only leaves once the server has confirmed the sign-out; otherwise it says so, so nobody walks away still signed in.
  async function signOut() {
    signingOut.current = true;
    setSignOutError("");
    const problem = await requestSignOut("/api/admin/logout");
    if (!problem) {
      window.location.href = "/";
      return;
    }
    setSignOutError(problem);
    signingOut.current = false;
  }

  useEffect(() => {
    if (preview) return;
    let active = true;
    let timer = 0;
    async function check() {
      // A dropped connection is simply checked again on the next round.
      const response = await fetch("/api/staff/status", { cache: "no-store" }).catch(() => null);
      if (!response || !active || signingOut.current) return;
      // This waiting session no longer works (it expired, was signed out elsewhere, the request was reset, or it is from before an update):
      // say so and offer sign-in, instead of showing "approval in progress" forever.
      if (response.status === 401 || response.status === 404) {
        window.clearInterval(timer);
        setStatus("Ended");
        return;
      }
      const result = await response.json().catch(() => ({})) as { status?: "Pending" | "Approved" | "Rejected"; redirect?: string };
      if (!active || signingOut.current) return;
      if (result.status === "Approved" && result.redirect) {
        window.location.href = result.redirect;
      } else if (result.status === "Rejected") setStatus("Rejected");
    }
    void check();
    timer = window.setInterval(check, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [preview]);

  return <main className={styles.teamShell}>
    <section className={styles.accessCard}>
      <BrandLogo kind="tradie" tone="dark" className={styles.teamLogo} />
      <div className={styles.statusMark}><span>{status === "Pending" ? "···" : status === "Ended" ? "!" : "×"}</span></div>
      <p className={styles.eyebrow}>Staff access control</p>
      <h1>{status === "Pending" ? "Owner approval in progress." : status === "Ended" ? "Please sign in again." : "Access was not approved."}</h1>
      <p>{status === "Pending" ? "Your secure access request was received. The Owner must assign your role and approve access before your workspace opens." : status === "Ended" ? "This waiting page has signed out. Sign in again with your email and password (no Team Code needed) to see whether the Owner has approved your access." : "The Owner has reviewed this request. Please contact the Owner if your role or details need to be corrected."}</p>
      <div className={styles.identityRow}><span>Request email</span><strong>{email}</strong></div>
      {status === "Pending" && <div className={styles.progressRow}><i /><span>This page checks automatically. You do not need to sign in again.</span></div>}
      {status === "Ended" ? <Link href="/#team-sign-in">Sign in again</Link> : <Link href="/">Return to public website</Link>}{" "}
      {!preview && status !== "Ended" && <Link href="/" onClick={(event) => { event.preventDefault(); void signOut(); }}>Sign out on this device</Link>}
      {signOutError && <p role="alert">{signOutError}</p>}
    </section>
  </main>;
}

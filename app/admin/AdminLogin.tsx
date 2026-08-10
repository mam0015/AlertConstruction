"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "../BrandLogo";
import styles from "./admin.module.css";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, teamCode }) });
      const result = await response.json() as { error?: string; redirect?: string; status?: string };
      if (!response.ok) throw new Error(result.error ?? "Sign-in failed.");
      router.push(result.redirect ?? "/admin");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className={styles.loginShell}>
    <section className={styles.loginFrame}>
      <div className={styles.loginIntro}>
        <BrandLogo kind="tradie" tone="dark" className={styles.loginLogo} />
        <div className={styles.loginCopy}>
          <p className={styles.eyebrow}>Management portal · Admin</p>
          <h1>The operational desk.</h1>
          <p>Move customer requests into delivery, coordinate the Site Supervisor and keep every project action visible.</p>
        </div>
        <div className={styles.loginScope}>
          <div><span>01</span><p><strong>Requests</strong>Review and qualify new work.</p></div>
          <div><span>02</span><p><strong>Delivery</strong>Schedule site actions and follow-up.</p></div>
          <div><span>03</span><p><strong>Communication</strong>Send clear direction to the team.</p></div>
        </div>
      </div>
      <form className={styles.loginForm} onSubmit={submit}>
        <div className={styles.loginHeading}><span>AD</span><div><strong>Staff access request</strong><small>Owner approval is required</small></div></div>
        <label><span>Email address</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label><span>Team Code</span><input type="password" value={teamCode} onChange={(event) => setTeamCode(event.target.value)} required /></label>
        {error && <p className={styles.loginError}>{error}</p>}
        <button className={styles.primaryButton} disabled={busy}>{busy ? "Checking with Owner…" : "Check staff access"}<span>→</span></button>
        <small>First-time access is sent to the Owner. Your workspace opens only after your role is approved.</small>
      </form>
    </section>
    <Link className={styles.backLink} href="/">← Return to public website</Link>
  </main>;
}

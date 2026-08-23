"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./owner.module.css";

type Settings = {
  account: { email: string; displayName: string; updatedAt: string };
  teamCode: string;
  teamCodeUpdatedAt: string;
};

export default function OwnerSettingsPanel({
  ownerEmail,
  ownerName,
  onManageStaff,
}: {
  ownerEmail: string;
  ownerName: string;
  onManageStaff: () => void;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [email, setEmail] = useState(ownerEmail);
  const [displayName, setDisplayName] = useState(ownerName);
  const [profilePassword, setProfilePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showTeamCode, setShowTeamCode] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch("/api/owner/settings", { cache: "no-store" });
      const result = await response.json() as { data?: Settings; error?: string };
      if (!active) return;
      if (!response.ok || !result.data) {
        setError(result.error ?? "Settings could not be loaded.");
        return;
      }
      setSettings(result.data);
      setEmail(result.data.account.email);
      setDisplayName(result.data.account.displayName);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function update(payload: Record<string, string>) {
    setBusy(payload.action);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/owner/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { data?: Settings; error?: string; message?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Settings could not be saved.");
      setSettings(result.data);
      setEmail(result.data.account.email);
      setDisplayName(result.data.account.displayName);
      setMessage(result.message ?? "Settings saved.");
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Settings could not be saved.");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await update({ action: "profile", email, displayName, currentPassword: profilePassword })) {
      setProfilePassword("");
      router.refresh();
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New password confirmation does not match.");
      return;
    }
    if (await update({ action: "password", currentPassword, newPassword })) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function copyTeamCode() {
    if (!settings) return;
    await navigator.clipboard.writeText(settings.teamCode);
    setMessage("Team Code copied.");
  }

  async function resetTeamCode() {
    if (!window.confirm("Reset the Team Code? The previous code will stop working for new access requests.")) return;
    if (await update({ action: "team-code" })) setShowTeamCode(true);
  }

  return <section className={styles.settingsWorkspace}>
    {(message || error) && <div className={`${styles.settingsNotice} ${error ? styles.settingsError : ""}`}>{error || message}</div>}
    <div className={styles.settingsGrid}>
      <article className={`${styles.panel} ${styles.teamCodeCard}`}>
        <div className={styles.settingsCardHeading}><span>Company access</span><h2>Team Code</h2><p>Give this code only to a new team member. Owner never enters it.</p></div>
        <div className={styles.teamCodeDisplay}>
          <span>{showTeamCode ? settings?.teamCode ?? "Loading…" : "•••• •••• ••••"}</span>
          <button type="button" onClick={() => setShowTeamCode((shown) => !shown)}>{showTeamCode ? "Hide" : "Reveal"}</button>
        </div>
        <div className={styles.settingsActions}>
          <button type="button" onClick={copyTeamCode} disabled={!settings}>Copy code</button>
          <button type="button" onClick={resetTeamCode} disabled={Boolean(busy)}>{busy === "team-code" ? "Resetting…" : "Reset Team Code"}</button>
        </div>
        <small>After a team member is approved, their saved account no longer needs this code.</small>
      </article>

      <article className={`${styles.panel} ${styles.staffSettingsCard}`}>
        <div className={styles.settingsCardHeading}><span>People & roles</span><h2>Employees</h2><p>Approve new requests, change positions or reject access from the same Owner dashboard.</p></div>
        <div className={styles.staffSettingsGraphic}><span>+</span><div><strong>Access queue</strong><small>Owner-controlled role assignment</small></div></div>
        <button className={styles.primaryButton} type="button" onClick={onManageStaff}>Manage employees &amp; roles</button>
      </article>
    </div>

    <div className={styles.settingsGrid}>
      <form className={`${styles.panel} ${styles.settingsForm}`} onSubmit={saveProfile}>
        <div className={styles.settingsCardHeading}><span>Owner identity</span><h2>Email &amp; profile</h2><p>Changing the email also changes the username used in the shared sign-in form.</p></div>
        <label><span>Display name</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
        <label><span>Owner email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label><span>Current password</span><input type="password" autoComplete="current-password" value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} required /></label>
        <button className={styles.primaryButton} disabled={Boolean(busy)}>{busy === "profile" ? "Saving…" : "Save Owner profile"}</button>
      </form>

      <form className={`${styles.panel} ${styles.settingsForm}`} onSubmit={savePassword}>
        <div className={styles.settingsCardHeading}><span>Account access</span><h2>Reset password</h2><p>The new password becomes active immediately for Owner sign-in.</p></div>
        <label><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <label><span>New password</span><input type="password" autoComplete="new-password" minLength={10} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
        <label><span>Confirm new password</span><input type="password" autoComplete="new-password" minLength={10} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
        <button className={styles.primaryButton} disabled={Boolean(busy)}>{busy === "password" ? "Updating…" : "Update password"}</button>
      </form>
    </div>
  </section>;
}

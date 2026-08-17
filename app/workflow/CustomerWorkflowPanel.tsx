"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./customer-workflow.module.css";

type TimelineStep = { key: string; label: string; index: number; state: "done" | "current" | "next" | "attention" };
type FileItem = { id: number; fileName?: string; file_name?: string; mimeType?: string; mime_type?: string; url: string; category?: string };
type ScheduleItem = { id: number; event_date: string; start_time?: string; end_time?: string; title: string; assignee?: string; status?: string; notes?: string };
type CustomerData = {
  id: number;
  requestCode: string;
  projectCode: string;
  service: string;
  suburb: string;
  stage: string;
  siteVisitAt: string;
  updatedAt: string;
  timeline: TimelineStep[];
  estimate: null | { amountCents: number; scope: string; terms: string; status: string; sentAt: string };
  updates: Array<{ id: number; workDate: string; customerUpdate: string; publishedAt: string; files: FileItem[] }>;
  documents: FileItem[];
  activity: Array<{ title: string; detail: string; created_at?: string; createdAt?: string }>;
  schedule: ScheduleItem[];
  messages: Array<{ id: number; sender_type: string; subject: string; body: string; created_at: string }>;
};

const stageText: Record<string, string> = {
  request_submitted: "Your request is waiting for review",
  admin_review: "Your request is under review",
  customer_contacted: "Our team is reviewing the confirmed details",
  site_visit_ready: "A site inspection is being organised",
  site_visit_scheduled: "Site inspection scheduled",
  site_visit_submitted: "Site inspection is being reviewed",
  visit_changes_requested: "Site inspection details are being updated",
  site_visit_approved: "Site inspection approved",
  estimate_ready: "Your estimate is being prepared",
  estimate_sent: "Your estimate is ready for review",
  estimate_declined: "Estimate declined — our team will contact you",
  customer_approved: "Your approval has been received",
  active_project: "Your project is in progress",
  complete: "Project complete",
};

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(cents / 100);
}
function date(value?: string, includeTime = true) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", includeTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}
function fileName(file: FileItem) { return file.fileName || file.file_name || "Project file"; }

const legacyStageOrder = ["request_submitted","admin_review","customer_contacted","site_visit_ready","site_visit_scheduled","site_visit_submitted","visit_changes_requested","site_visit_approved","estimate_ready","estimate_sent","estimate_declined","customer_approved","active_project","complete"];
const legacySteps = [
  { key: "request", label: "Request received", stages: ["request_submitted"] },
  { key: "review", label: "Under review", stages: ["admin_review","customer_contacted"] },
  { key: "inspection", label: "Site inspection", stages: ["site_visit_ready","site_visit_scheduled","site_visit_submitted","visit_changes_requested","site_visit_approved"] },
  { key: "estimate", label: "Estimate & approval", stages: ["estimate_ready","estimate_sent","estimate_declined","customer_approved"] },
  { key: "project", label: "Project in progress", stages: ["active_project"] },
  { key: "complete", label: "Complete / handover", stages: ["complete"] },
];
function deriveTimeline(stage: string): TimelineStep[] {
  const current = legacyStageOrder.indexOf(stage);
  return legacySteps.map((step, index) => {
    const indexes = step.stages.map((value) => legacyStageOrder.indexOf(value));
    const low = Math.min(...indexes), high = Math.max(...indexes);
    const state: TimelineStep["state"] = stage === "estimate_declined" && step.key === "estimate" ? "attention" : current > high ? "done" : current >= low ? "current" : "next";
    return { key: step.key, label: step.label, index: index + 1, state };
  });
}
function normaliseCustomerData(raw: any): CustomerData {
  return {
    ...raw,
    timeline: Array.isArray(raw?.timeline) ? raw.timeline : deriveTimeline(String(raw?.stage ?? "request_submitted")),
    updates: Array.isArray(raw?.updates) ? raw.updates : [],
    documents: Array.isArray(raw?.documents) ? raw.documents : [],
    activity: Array.isArray(raw?.activity) ? raw.activity : [],
    schedule: Array.isArray(raw?.schedule) ? raw.schedule : [],
    messages: Array.isArray(raw?.messages) ? raw.messages : [],
  } as CustomerData;
}

export default function CustomerWorkflowPanel({ code }: { code: string }) {
  const [data, setData] = useState<CustomerData | null>(null);
  const [error, setError] = useState("");
  const [needsAccess, setNeedsAccess] = useState(false);
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [messageState, setMessageState] = useState("");

  async function load() {
    setError("");
    const response = await fetch(`/api/workflow/public?code=${encodeURIComponent(code)}`, { cache: "no-store" });
    const result = await response.json() as { data?: CustomerData; error?: string; needsCustomerAccess?: boolean };
    if (response.status === 401 && result.needsCustomerAccess) {
      setNeedsAccess(true);
      setData(null);
      return;
    }
    if (!response.ok || !result.data) throw new Error(result.error ?? "Project information could not be loaded.");
    setNeedsAccess(false);
    setData(normaliseCustomerData(result.data));
  }

  useEffect(() => {
    let active = true;
    void load().catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Project information could not be loaded."); });
    return () => { active = false; };
    // code is the only external key; load is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const currentStep = useMemo(() => data?.timeline.find((step) => step.state === "current" || step.state === "attention") ?? null, [data]);

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/workflow/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "customer_access", code, email }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Customer access could not be verified.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Customer access could not be verified."); }
    finally { setWorking(false); }
  }

  async function decide(decision: "accept" | "decline") {
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/workflow/public", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, decision }),
      });
      const result = await response.json() as { data?: CustomerData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Your decision could not be saved.");
      setData(normaliseCustomerData(result.data));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your decision could not be saved."); }
    finally { setWorking(false); }
  }


  async function openFile(url: string) {
    setWorking(true); setError("");
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(result.error ?? "File could not be opened.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "File could not be opened."); }
    finally { setWorking(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setWorking(true); setMessageState(""); setError("");
    try {
      let response = await fetch(`/api/workflow/public/messages?code=${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: form.get("subject"), message: form.get("message") }),
      });
      if (response.status === 404) {
        response = await fetch(`/api/track/${encodeURIComponent(code)}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: form.get("subject"), message: form.get("message") }),
        });
      }
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Message could not be sent.");
      event.currentTarget.reset();
      setMessageState("Message sent to the project team.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Message could not be sent."); }
    finally { setWorking(false); }
  }

  if (needsAccess) {
    return <section className={styles.accessCard}>
      <span className={styles.eyebrow}>SECURE CUSTOMER ACCESS</span>
      <h1>Open your project</h1>
      <p>Enter the email address used with reference <strong>{code}</strong>. The reference identifies the project; it is not used as your password.</p>
      <form onSubmit={unlock}>
        <label><span>Email address</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" /></label>
        <button disabled={working}>{working ? "Checking…" : "Continue securely"}</button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </section>;
  }

  if (!data) return <section className={styles.loading}>{error ? <span className={styles.error}>{error}</span> : "Opening your approved project information…"}</section>;

  return <section className={styles.shell}>
    <header className={styles.hero}>
      <div>
        <span className={styles.eyebrow}>CUSTOMER PROJECT PORTAL</span>
        <h1>{data.projectCode || data.requestCode}</h1>
        <p>{data.service}{data.suburb ? ` · ${data.suburb}` : ""}{data.projectCode ? ` · Customer reference ${data.requestCode}` : ""}</p>
      </div>
      <div className={styles.statusBox}>
        <small>Current status</small>
        <strong>{stageText[data.stage] ?? "Project update in progress"}</strong>
        <span>Updated {date(data.updatedAt)}</span>
      </div>
    </header>

    <div className={styles.privacyNote}><i>✓</i><p><strong>Only approved customer information appears here.</strong><span>If Admin and Owner have not approved a site detail, date, photo or update, it stays hidden.</span></p></div>

    <section className={styles.timelineCard}>
      <div className={styles.sectionHeading}><div><span>PROJECT JOURNEY</span><h2>Where your project is now</h2></div>{currentStep && <b>{currentStep.label}</b>}</div>
      <ol className={styles.timeline}>
        {data.timeline.map((step) => <li key={step.key} className={styles[step.state]}>
          <i>{step.state === "done" ? "✓" : step.index}</i>
          <div><strong>{step.label}</strong><span>{step.state === "done" ? "Completed" : step.state === "current" ? "Current stage" : step.state === "attention" ? "Needs attention" : "Upcoming"}</span></div>
        </li>)}
      </ol>
    </section>

    {data.estimate && <article className={styles.estimate}>
      <div><span>PROJECT ESTIMATE</span><strong>{money(data.estimate.amountCents)}</strong><small>{data.estimate.sentAt ? `Sent ${date(data.estimate.sentAt)}` : "Preparing"}</small></div>
      <div><h3>Scope included</h3><p>{data.estimate.scope}</p>{data.estimate.terms && <small>{data.estimate.terms}</small>}</div>
      {data.estimate.status === "sent"
        ? <div className={styles.decision}><button disabled={working} onClick={() => void decide("decline")}>Decline</button><button disabled={working} onClick={() => void decide("accept")}>Accept estimate</button></div>
        : <b className={styles.decisionStatus}>{data.estimate.status === "customer_accepted" ? "✓ Estimate accepted" : "Estimate declined"}</b>}
    </article>}

    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><div><span>APPROVED UPDATES</span><h2>Project progress</h2></div><b>{data.updates.length}</b></div>
        {data.updates.length ? data.updates.map((update) => <article className={styles.update} key={update.id}>
          <small>{date(update.publishedAt)}</small>
          <p>{update.customerUpdate}</p>
          {!!update.files.length && <div className={styles.fileLinks}>{update.files.map((file) => <button type="button" onClick={() => void openFile(file.url)} key={file.id}>View {fileName(file)}</button>)}</div>}
        </article>) : <p className={styles.empty}>No customer update has been approved yet. Your request is still being handled by the team.</p>}
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeading}><div><span>APPROVED SCHEDULE</span><h2>Upcoming site work</h2></div><b>{data.schedule.length}</b></div>
        {data.schedule.length ? <div className={styles.scheduleList}>{data.schedule.map((item) => <article key={item.id}>
          <div><strong>{date(item.event_date, false)}</strong><small>{item.start_time ? item.start_time.slice(0, 5) : "Time to be confirmed"}</small></div>
          <div><h3>{item.title}</h3><p>{item.assignee || "Project team"}</p></div>
          <b>{item.status || "Planned"}</b>
        </article>)}</div> : <p className={styles.empty}>No site date has been approved for customer view yet.</p>}
      </section>
    </div>

    <div className={styles.grid}>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><div><span>SHARED FILES</span><h2>Project documents</h2></div><b>{data.documents.length}</b></div>
        {data.documents.length ? <div className={styles.documentList}>{data.documents.map((file) => <button type="button" key={file.id} onClick={() => void openFile(file.url)}><span>FILE</span><strong>{fileName(file)}</strong><b>Open →</b></button>)}</div> : <p className={styles.empty}>No document has been shared with you yet.</p>}
      </section>

      <section className={styles.card}>
        <div className={styles.sectionHeading}><div><span>PROJECT SUPPORT</span><h2>Message the team</h2></div></div>
        <form className={styles.messageForm} onSubmit={sendMessage}>
          <label><span>Subject</span><input name="subject" required placeholder="What is your question about?" /></label>
          <label><span>Message</span><textarea name="message" rows={5} required placeholder="Write your project question here…" /></label>
          <button disabled={working}>{working ? "Sending…" : "Send message"}</button>
        </form>
        {messageState && <p className={styles.success}>{messageState}</p>}
      </section>
    </div>

    <section className={styles.card}>
      <div className={styles.sectionHeading}><div><span>APPROVED ACTIVITY</span><h2>Project history</h2></div></div>
      {data.activity.length ? <ol className={styles.activity}>{data.activity.map((item, index) => <li key={`${item.created_at || item.createdAt}-${index}`}><i/><div><strong>{item.title}</strong>{item.detail && <p>{item.detail}</p>}<small>{date(item.created_at || item.createdAt)}</small></div></li>)}</ol> : <p className={styles.empty}>Your request has been received. More information will appear after the team completes and approves the next action.</p>}
    </section>

    {error && <p className={styles.error}>{error}</p>}
  </section>;
}

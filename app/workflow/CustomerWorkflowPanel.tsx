"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { newClientKey } from "./client-key";
import { stageLabels, type WorkflowStage } from "./types";
import styles from "./customer-workflow.module.css";

type CustomerData = {
  id: number;
  requestCode: string;
  projectCode: string;
  service: string;
  suburb: string;
  stage: WorkflowStage;
  siteVisitAt: string;
  updatedAt: string;
  progress: number;
  // version: the decision key of the quote on screen (Accept / Decline name it).
  estimate: null | { amountCents: number; scope: string; terms: string; status: string; sentAt: string; version: string };
  updates: Array<{ id: number; workDate: string; customerUpdate: string; publishedAt: string; files: Array<{ id: number; fileName: string; url: string }> }>;
  activity: Array<{ title: string; detail: string; createdAt: string }>;
  proposals: Array<{ id: number; title: string; detail: string; status: string; createdAt: string; customerReply: string; decidedAt: string }>;
  messages: Array<{ id: number; sender: "Admin" | "Customer"; senderLabel: string; body: string; kind: "message" | "document_request"; createdAt: string }>;
  customerStatus?: { title: string; detail: string; shownAt: string } | null;
  notes?: Array<{ id: number; body: string; showFrom: string; showUntil: string; createdAt: string }>;
};

// Whole dollars without cents ($25,000); otherwise always two decimals ($24,842.40, never $24,842.4).
function money(cents: number) { return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100); }
function day(value: string) { const parsed = new Date(`${value}T12:00:00`); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" }).format(parsed); }
function date(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(parsed); }

export default function CustomerWorkflowPanel({ code }: { code: string }) {
  const [data, setData] = useState<CustomerData | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [messageText, setMessageText] = useState("");
  // One key per message: a retry after a lost answer is recognised and not saved twice; renewed once the message is saved.
  const [messageKey, setMessageKey] = useState(newClientKey);
  const [notice, setNotice] = useState("");
  // Every answer that changes the page moves this on. A read (first load, the 20-second refresh) applies only if nothing newer arrived
  // while it was on its way, so an older answer can never hide a message the customer has just sent or bring back an old decision.
  const generation = useRef(0);
  const applySaved = (fresh: CustomerData) => { generation.current += 1; setData(fresh); };
  const applyRead = (fresh: CustomerData, startedAt: number) => { if (generation.current !== startedAt) return; generation.current += 1; setData(fresh); };
  const reread = () => {
    const startedAt = generation.current;
    void fetch(`/api/workflow/public?code=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (reply) => { const fresh = reply.ok ? (await reply.json() as { data?: CustomerData }).data : undefined; if (fresh) applyRead(fresh, startedAt); })
      .catch(() => undefined);
  };

  useEffect(() => {
    let active = true;
    const startedAt = generation.current;
    void fetch(`/api/workflow/public?code=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { data?: CustomerData; error?: string } }))
      .then(({ response, result }) => {
        if (!active) return;
        if (response.ok && result.data) { if (generation.current === startedAt) { generation.current += 1; setData(result.data); } }
        else setError(result.error ?? "Project workflow is not available yet.");
      })
      .catch(() => { if (active) setError("Project workflow is not available yet."); });
    // New messages, notes and status changes appear without reloading: a quiet refresh every 20 seconds while the page is in view.
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const startedAt = generation.current;
      void fetch(`/api/workflow/public?code=${encodeURIComponent(code)}`, { cache: "no-store" })
        .then(async (response) => response.ok ? (await response.json() as { data?: CustomerData }).data : undefined)
        .then((fresh) => { if (active && fresh && generation.current === startedAt) { generation.current += 1; setData(fresh); } })
        .catch(() => undefined);
    }, 20_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [code]);

  async function decide(decision: "accept" | "decline") {
    setWorking(true); setError("");
    try {
      // The decision names the version on screen; if the quote was revised meanwhile, the page shows the new one instead.
      const response = await fetch("/api/workflow/public", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, decision, estimateVersion: data?.estimate?.version ?? "" }) });
      const result = await response.json() as { data?: CustomerData; error?: string };
      if (response.status === 409) { reread(); throw new Error(result.error ?? "This estimate was updated. Please review the latest estimate."); }
      if (!response.ok || !result.data) throw new Error(result.error ?? "Your decision could not be saved.");
      applySaved(result.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your decision could not be saved."); }
    finally { setWorking(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageText.trim()) return;
    setWorking(true); setError(""); setNotice("");
    try {
      const sentText = messageText;
      const response = await fetch("/api/workflow/public/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, body: sentText, clientKey: messageKey }) });
      const result = await response.json().catch(() => ({})) as { data?: CustomerData | null; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your message could not be sent.");
      setMessageKey(newClientKey());
      // Only the message that was sent is cleared; anything typed meanwhile stays.
      setMessageText((current) => current === sentText ? "" : current);
      if (result.data) applySaved(result.data);
      else { generation.current += 1; reread(); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your message could not be sent."); }
    finally { setWorking(false); }
  }

  async function uploadDocument(file?: File) {
    if (!file || !data) return;
    setWorking(true); setError(""); setNotice("");
    try {
      const form = new FormData(); form.set("caseId", String(data.id)); form.set("code", code); form.set("file", file);
      const response = await fetch("/api/workflow/public/files", { method: "POST", body: form });
      const result = await response.json() as { data?: { fileName: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The document could not be uploaded.");
      setNotice(`${result.data.fileName} was sent to our team.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The document could not be uploaded."); }
    finally { setWorking(false); }
  }

  async function decideChange(proposalId: number, decision: "accept" | "decline") {
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/workflow/public", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, decision, proposalId, reply: replies[proposalId] ?? "" }) });
      const result = await response.json() as { data?: CustomerData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Your reply could not be saved.");
      applySaved(result.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your reply could not be saved."); }
    finally { setWorking(false); }
  }

  if (!data) return error ? <section className={styles.loading}>{error} Check the reference code or use the secure support form.</section> : <section className={styles.loading}>Opening your approved project information…</section>;

  return <section className={styles.customerWorkflow}>
    <header><div><span>LIVE REQUEST & PROJECT WORKFLOW</span><h2>{data.projectCode || data.requestCode}</h2><p>{data.service}{data.suburb ? ` · ${data.suburb}` : ""}</p></div><b>{stageLabels[data.stage]}{Number(data.progress) > 0 ? ` · ${Math.min(100, Number(data.progress))}%` : ""}</b></header>
    {data.customerStatus && <section className={styles.proposals} aria-label="Project status"><article className={styles.proposal}>
      <span>PROJECT STATUS</span>
      <h3>{data.customerStatus.title}</h3>
      {data.customerStatus.detail && <p style={{ whiteSpace: "pre-wrap" }}>{data.customerStatus.detail}</p>}
      <small>Updated {date(data.customerStatus.shownAt)}</small>
    </article></section>}
    {(data.notes?.length ?? 0) > 0 && <section className={styles.proposals} aria-label="Notes from our team"><article className={styles.proposal}>
      <span>NOTES FROM OUR TEAM</span>
      {data.notes!.map((note) => <div key={note.id} style={{ margin: "10px 0", padding: "10px 14px", borderLeft: "3px solid #f5b900" }}><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{note.body}</p>{note.showUntil && <small>Until {day(note.showUntil)}</small>}</div>)}
    </article></section>}
    <div className={styles.privacyNote}><i>✓</i><p><strong>Only customer-approved information is shown here.</strong><span>Internal site notes, pricing analysis and team conversations remain private.</span></p></div>
    {data.estimate && <article className={styles.estimate}>
      <div><span>PROJECT ESTIMATE</span><strong>{money(data.estimate.amountCents)}</strong><small>Sent {date(data.estimate.sentAt)}</small></div>
      <div><h3>Scope included</h3><p style={{ whiteSpace: "pre-wrap" }}>{data.estimate.scope}</p><small>{data.estimate.terms}</small></div>
      {/* Accept and Decline only while the job is really waiting for this decision (not on a closed request). */}
      {data.estimate.status === "sent" && data.stage === "estimate_sent" ? <div className={styles.decision}><button disabled={working} onClick={() => void decide("decline")}>Decline</button><button disabled={working} onClick={() => void decide("accept")}>Accept estimate</button></div> : <b className={styles.decisionStatus}>{data.estimate.status === "customer_accepted" ? "✓ Estimate accepted" : data.estimate.status === "customer_declined" ? "Estimate declined" : "This estimate is no longer open for a decision."}</b>}
    </article>}
    {data.proposals.length > 0 && <section className={styles.proposals}>{data.proposals.map((proposal) => <article className={styles.proposal} key={proposal.id}>
      <span>PROPOSED CHANGE</span>
      <h3>{proposal.title}</h3>
      <p>{proposal.detail}</p>
      {proposal.status === "sent" && data.stage === "active_project" ? <>
        <textarea maxLength={2000} value={replies[proposal.id] ?? ""} onChange={(event) => setReplies((all) => ({ ...all, [proposal.id]: event.target.value }))} placeholder="Optional reply — ask a question or add a condition…" />
        <div className={styles.decision}><button disabled={working} onClick={() => void decideChange(proposal.id, "decline")}>Decline</button><button disabled={working} onClick={() => void decideChange(proposal.id, "accept")}>I&apos;m OK with this</button></div>
      </> : <>
        <b className={styles.decisionStatus}>{proposal.status === "accepted" ? "✓ You approved this change"
          : proposal.status === "declined" ? "You declined this change"
          : proposal.status === "withdrawn" ? "Withdrawn — no decision is needed for this change."
          : proposal.status === "sent" && ["quality_inspection", "completion_ready"].includes(data.stage) ? "On hold while we inspect the finished work. If more work is booked you can answer it here; otherwise it is withdrawn when the job is completed."
          : "This change is no longer open for a decision."}</b>
        {proposal.customerReply && <div className={styles.proposalReply}>Your reply: &quot;{proposal.customerReply}&quot;</div>}
      </>}
    </article>)}</section>}
    <section className={styles.proposals}>
      <article className={styles.proposal}>
        <span>MESSAGES WITH OUR TEAM</span>
        {data.messages.length === 0 && <p>No messages yet. Ask us a question or send documents below.</p>}
        {data.messages.map((message) => <div key={message.id} style={{ margin: "10px 0", padding: "10px 14px", borderLeft: `3px solid ${message.sender === "Admin" ? "#f5b900" : "#7a8"}` }}>
          <small>{message.sender === "Admin" ? message.senderLabel : "You"} · {date(message.createdAt)}{message.kind === "document_request" ? " · DOCUMENTS REQUESTED" : ""}</small>
          <p>{message.body}</p>
        </div>)}
        {data.stage === "closed" ? <p>This request is closed, so new messages cannot be sent here. Everything above stays available. Please use the support form if you need us.</p> : <form onSubmit={(event) => void sendMessage(event)}>
          <textarea value={messageText} onChange={(event) => { setMessageText(event.target.value); setMessageKey(newClientKey()); }} placeholder="Write a message to our team…" maxLength={2000} aria-label="Your message" />
          <div className={styles.decision}>{data.stage !== "complete" && <label style={{ cursor: "pointer" }}>Attach a photo or PDF (max 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "block" }} onChange={(event) => { void uploadDocument(event.target.files?.[0]); event.target.value = ""; }} disabled={working} /></label>}<button disabled={working || !messageText.trim()}>Send message</button></div>
        </form>}
        {notice && <b className={styles.decisionStatus}>✓ {notice}</b>}
      </article>
    </section>
    <div className={styles.customerGrid}>
      <section><header><span>APPROVED UPDATES</span><strong>{data.updates.length}</strong></header>{data.updates.length ? data.updates.map((update) => <article className={styles.update} key={update.id}><small>{date(update.publishedAt)}</small><p>{update.customerUpdate}</p>{update.files.length > 0 && <div>{update.files.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}>View {file.fileName}</a>)}</div>}</article>) : <p className={styles.empty}>No customer update has passed Admin and Owner approval yet.</p>}</section>
      <section><header><span>APPROVED ACTIVITY</span><strong>Latest</strong></header>{data.activity.length === 0 && <p className={styles.empty}>Your request is with our team. Each step we take on it will appear here.</p>}<ol>{data.activity.map((item, index) => <li key={`${item.createdAt}-${index}`}><i /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{date(item.createdAt)}</small></div></li>)}</ol></section>
    </div>
    {error && <p className={styles.error}>{error}</p>}
  </section>;
}

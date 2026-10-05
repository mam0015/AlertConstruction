"use client";

import { FormEvent, useEffect, useState } from "react";
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
  estimate: null | { amountCents: number; scope: string; terms: string; status: string; sentAt: string };
  updates: Array<{ id: number; workDate: string; customerUpdate: string; publishedAt: string; files: Array<{ id: number; fileName: string; url: string }> }>;
  activity: Array<{ title: string; detail: string; createdAt: string }>;
  proposals: Array<{ id: number; title: string; detail: string; status: string; createdAt: string; customerReply: string; decidedAt: string }>;
  messages: Array<{ id: number; sender: "Admin" | "Customer"; senderLabel: string; body: string; kind: "message" | "document_request"; createdAt: string }>;
};

function money(cents: number) { return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(cents / 100); }
function date(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(parsed); }

export default function CustomerWorkflowPanel({ code }: { code: string }) {
  const [data, setData] = useState<CustomerData | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [messageText, setMessageText] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/workflow/public?code=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { data?: CustomerData; error?: string } }))
      .then(({ response, result }) => {
        if (!active) return;
        if (response.ok && result.data) setData(result.data);
        else setError(result.error ?? "Project workflow is not available yet.");
      })
      .catch(() => { if (active) setError("Project workflow is not available yet."); });
    return () => { active = false; };
  }, [code]);

  async function decide(decision: "accept" | "decline") {
    setWorking(true); setError("");
    try {
      const response = await fetch("/api/workflow/public", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, decision }) });
      const result = await response.json() as { data?: CustomerData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Your decision could not be saved.");
      setData(result.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your decision could not be saved."); }
    finally { setWorking(false); }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageText.trim()) return;
    setWorking(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/workflow/public/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, body: messageText }) });
      const result = await response.json() as { data?: CustomerData; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Your message could not be sent.");
      setData(result.data); setMessageText("");
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
      setData(result.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your reply could not be saved."); }
    finally { setWorking(false); }
  }

  if (!data) return error ? <section className={styles.loading}>{error} Check the reference code or use the secure support form.</section> : <section className={styles.loading}>Opening your approved project information…</section>;

  return <section className={styles.customerWorkflow}>
    <header><div><span>LIVE REQUEST & PROJECT WORKFLOW</span><h2>{data.projectCode || data.requestCode}</h2><p>{data.service}{data.suburb ? ` · ${data.suburb}` : ""}</p></div><b>{stageLabels[data.stage]} · {Math.max(0, Math.min(100, Number(data.progress) || 0))}%</b></header>
    <div className={styles.privacyNote}><i>✓</i><p><strong>Only customer-approved information is shown here.</strong><span>Internal site notes, pricing analysis and team conversations remain private.</span></p></div>
    {data.estimate && <article className={styles.estimate}>
      <div><span>PROJECT ESTIMATE</span><strong>{money(data.estimate.amountCents)}</strong><small>Sent {date(data.estimate.sentAt)}</small></div>
      <div><h3>Scope included</h3><p>{data.estimate.scope}</p><small>{data.estimate.terms}</small></div>
      {data.estimate.status === "sent" ? <div className={styles.decision}><button disabled={working} onClick={() => void decide("decline")}>Decline</button><button disabled={working} onClick={() => void decide("accept")}>Accept estimate</button></div> : <b className={styles.decisionStatus}>{data.estimate.status === "customer_accepted" ? "✓ Estimate accepted" : "Estimate declined"}</b>}
    </article>}
    {data.proposals.length > 0 && <section className={styles.proposals}>{data.proposals.map((proposal) => <article className={styles.proposal} key={proposal.id}>
      <span>PROPOSED CHANGE</span>
      <h3>{proposal.title}</h3>
      <p>{proposal.detail}</p>
      {proposal.status === "sent" ? <>
        <textarea value={replies[proposal.id] ?? ""} onChange={(event) => setReplies((all) => ({ ...all, [proposal.id]: event.target.value }))} placeholder="Optional reply — ask a question or add a condition…" />
        <div className={styles.decision}><button disabled={working} onClick={() => void decideChange(proposal.id, "decline")}>Decline</button><button disabled={working} onClick={() => void decideChange(proposal.id, "accept")}>I&apos;m OK with this</button></div>
      </> : <>
        <b className={styles.decisionStatus}>{proposal.status === "accepted" ? "✓ You approved this change" : "You declined this change"}</b>
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
        <form onSubmit={(event) => void sendMessage(event)}>
          <textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message to our team…" maxLength={2000} />
          <div className={styles.decision}><label style={{ cursor: "pointer" }}>Attach a photo or PDF (max 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "block" }} onChange={(event) => { void uploadDocument(event.target.files?.[0]); event.target.value = ""; }} disabled={working || data.stage === "closed"} /></label><button disabled={working || !messageText.trim()}>Send message</button></div>
        </form>
        {notice && <b className={styles.decisionStatus}>✓ {notice}</b>}
      </article>
    </section>
    <div className={styles.customerGrid}>
      <section><header><span>APPROVED UPDATES</span><strong>{data.updates.length}</strong></header>{data.updates.length ? data.updates.map((update) => <article className={styles.update} key={update.id}><small>{date(update.publishedAt)}</small><p>{update.customerUpdate}</p>{update.files.length > 0 && <div>{update.files.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}>View {file.fileName}</a>)}</div>}</article>) : <p className={styles.empty}>No customer update has passed Admin and Owner approval yet.</p>}</section>
      <section><header><span>APPROVED ACTIVITY</span><strong>Latest</strong></header><ol>{data.activity.map((item, index) => <li key={`${item.createdAt}-${index}`}><i /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{date(item.createdAt)}</small></div></li>)}</ol></section>
    </div>
    {error && <p className={styles.error}>{error}</p>}
  </section>;
}

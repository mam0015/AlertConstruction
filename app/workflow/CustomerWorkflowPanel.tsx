"use client";

import { useEffect, useState } from "react";
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
  estimate: null | { amountCents: number; scope: string; terms: string; status: string; sentAt: string };
  updates: Array<{ id: number; workDate: string; customerUpdate: string; publishedAt: string; files: Array<{ id: number; fileName: string; url: string }> }>;
  activity: Array<{ title: string; detail: string; createdAt: string }>;
};

function money(cents: number) { return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(cents / 100); }
function date(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(parsed); }

export default function CustomerWorkflowPanel({ code }: { code: string }) {
  const [data, setData] = useState<CustomerData | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

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

  if (!data) return error ? null : <section className={styles.loading}>Opening your approved project information…</section>;

  return <section className={styles.customerWorkflow}>
    <header><div><span>LIVE REQUEST & PROJECT WORKFLOW</span><h2>{data.projectCode || data.requestCode}</h2><p>{data.service}{data.suburb ? ` · ${data.suburb}` : ""}</p></div><b>{stageLabels[data.stage]}</b></header>
    <div className={styles.privacyNote}><i>✓</i><p><strong>Only customer-approved information is shown here.</strong><span>Internal site notes, pricing analysis and team conversations remain private.</span></p></div>
    {data.estimate && <article className={styles.estimate}>
      <div><span>PROJECT ESTIMATE</span><strong>{money(data.estimate.amountCents)}</strong><small>Sent {date(data.estimate.sentAt)}</small></div>
      <div><h3>Scope included</h3><p>{data.estimate.scope}</p><small>{data.estimate.terms}</small></div>
      {data.estimate.status === "sent" ? <div className={styles.decision}><button disabled={working} onClick={() => void decide("decline")}>Decline</button><button disabled={working} onClick={() => void decide("accept")}>Accept estimate</button></div> : <b className={styles.decisionStatus}>{data.estimate.status === "customer_accepted" ? "✓ Estimate accepted" : "Estimate declined"}</b>}
    </article>}
    <div className={styles.customerGrid}>
      <section><header><span>APPROVED UPDATES</span><strong>{data.updates.length}</strong></header>{data.updates.length ? data.updates.map((update) => <article className={styles.update} key={update.id}><small>{date(update.publishedAt)}</small><p>{update.customerUpdate}</p>{update.files.length > 0 && <div>{update.files.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}>View {file.fileName}</a>)}</div>}</article>) : <p className={styles.empty}>No customer update has passed Admin and Owner approval yet.</p>}</section>
      <section><header><span>APPROVED ACTIVITY</span><strong>Latest</strong></header><ol>{data.activity.map((item, index) => <li key={`${item.createdAt}-${index}`}><i /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{date(item.createdAt)}</small></div></li>)}</ol></section>
    </div>
    {error && <p className={styles.error}>{error}</p>}
  </section>;
}

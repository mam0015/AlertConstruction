"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { stageLabels, type WorkflowRole, type WorkflowSnapshot } from "./types";
import styles from "./workflow.module.css";

const empty: WorkflowSnapshot = { cases: [], events: [], supervisors: [], role: "admin" };
const journey = ["request_submitted", "admin_review", "customer_contacted", "site_visit_scheduled", "site_visit_submitted", "site_visit_approved", "estimate_ready", "estimate_sent", "customer_approved", "active_project", "quality_inspection", "completion_ready", "complete"] as const;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());

function when(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function currentJourneyIndex(stage: string) {
  if (stage === "visit_changes_requested") return 4;
  if (stage === "estimate_declined") return 7;
  if (stage === "complete") return journey.length - 1;
  return journey.indexOf(stage as (typeof journey)[number]);
}

export default function WorkflowBoard({ role }: { role: WorkflowRole }) {
  const [data, setData] = useState<WorkflowSnapshot>({ ...empty, role });
  const [selectedId, setSelectedId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [visitAt, setVisitAt] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [visitForm, setVisitForm] = useState({ visitDate: today(), summary: "", findings: "", recommendations: "", internalNotes: "" });
  const [estimateForm, setEstimateForm] = useState({ amount: "", scope: "", terms: "Final price and variations are governed by the signed contract and applicable Victorian law." });
  const [updateForm, setUpdateForm] = useState({ workDate: today(), internalUpdate: "", customerUpdate: "" });
  const [qualityForm, setQualityForm] = useState({ inspectedAt: today(), summary: "", defects: "" });
  const [sitePhotoIds, setSitePhotoIds] = useState<number[]>([]);
  const [progressPhotoIds, setProgressPhotoIds] = useState<number[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/workflow?previewRole=${role}`, { cache: "no-store" });
      const result = await response.json() as { data?: WorkflowSnapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Project workflow could not be loaded.");
      setData(result.data);
      setSelectedId((current) => result.data!.cases.some((item) => item.id === current) ? current : result.data!.cases[0]?.id ?? 0);
      if (result.data.supervisors[0]) setSupervisorEmail((current) => current || result.data!.supervisors[0].email);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Project workflow could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetch(`/api/workflow?previewRole=${role}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { data?: WorkflowSnapshot; error?: string } }))
      .then(({ response, result }) => {
        if (!response.ok || !result.data) throw new Error(result.error ?? "Project workflow could not be loaded.");
        if (!active) return;
        setData(result.data);
        setSelectedId(result.data.cases[0]?.id ?? 0);
        if (result.data.supervisors[0]) setSupervisorEmail(result.data.supervisors[0].email);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Project workflow could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role]);

  const selected = useMemo(() => data.cases.find((item) => item.id === selectedId) ?? data.cases[0] ?? null, [data.cases, selectedId]);
  const selectedEvents = useMemo(() => data.events.filter((item) => item.caseId === selected?.id), [data.events, selected]);
  const queue = role === "owner"
    ? data.cases.flatMap((item) => item.updates.filter((update) => update.status === "pending_owner"))
    : role === "admin"
      ? data.cases.filter((item) => ["request_submitted", "site_visit_submitted", "customer_approved"].includes(item.stage)).concat(data.cases.filter((item) => item.updates.some((update) => update.status === "pending_admin")))
      : data.cases;

  async function action(name: string, payload: Record<string, unknown> = {}, success = "Workflow updated.") {
    if (!selected) return;
    setWorking(true); setError("");
    try {
      const response = await fetch(`/api/workflow?previewRole=${role}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, caseId: selected.id, payload }) });
      const result = await response.json() as { data?: WorkflowSnapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The action could not be completed.");
      setData(result.data); setNotice(success); window.setTimeout(() => setNotice(""), 3600);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The action could not be completed."); }
    finally { setWorking(false); }
  }

  async function upload(category: "site_visit" | "progress" | "quality", file?: File) {
    if (!selected || !file) return;
    setWorking(true); setError("");
    try {
      const form = new FormData(); form.set("caseId", String(selected.id)); form.set("category", category); form.set("file", file);
      const response = await fetch(`/api/workflow/files?previewRole=${role}`, { method: "POST", body: form });
      const result = await response.json() as { data?: { id: number; fileName: string }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Photo upload failed.");
      if (category === "site_visit") setSitePhotoIds((ids) => [...ids, result.data!.id]);
      else setProgressPhotoIds((ids) => [...ids, result.data!.id]);
      setNotice(`${result.data.fileName} uploaded to ${selected.projectCode || selected.requestCode}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Photo upload failed."); }
    finally { setWorking(false); }
  }

  const selectedSupervisor = data.supervisors.find((item) => item.email === supervisorEmail) ?? data.supervisors[0];
  const progress = selected ? Math.max(0, currentJourneyIndex(selected.stage)) : 0;

  if (loading) return <section className={styles.loading}><i />Opening the live project workflow…</section>;

  return <section className={styles.workflowShell}>
    <div className={styles.workflowHeader}>
      <div><span>REQUEST → SITE VISIT → ESTIMATE → DELIVERY → QUALITY → COMPLETE</span><h2>Project workflow control</h2><p>Every hand-off is recorded. Customer updates stay private until Admin and Owner approve them.</p></div>
      <div className={styles.roleBadge}><i />{role === "supervisor" ? "Site Supervisor" : role[0].toUpperCase() + role.slice(1)} workspace</div>
    </div>
    {(notice || error) && <div className={`${styles.notice} ${error ? styles.error : ""}`}><strong>{error ? "Action stopped" : "Saved"}</strong><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}

    <div className={styles.summaryStrip}>
      <article><span>Workflow cases</span><strong>{data.cases.length}</strong><small>Visible to this role</small></article>
      <article><span>Action queue</span><strong>{queue.length}</strong><small>Waiting for your role</small></article>
      <article><span>Customer updates</span><strong>{data.cases.flatMap((item) => item.updates).filter((item) => item.status === "published").length}</strong><small>Approved and published</small></article>
      <article><span>Owner audit events</span><strong>{data.events.length}</strong><small>Complete activity record</small></article>
    </div>

    <div className={styles.workspaceGrid}>
      <aside className={styles.caseList}>
        <header><span>Project pipeline</span><strong>{data.cases.length} records</strong></header>
        {data.cases.map((item) => <button className={selected?.id === item.id ? styles.selectedCase : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
          <i className={styles.stageDot} /><div><small>{item.projectCode || item.requestCode}</small><strong>{item.service}</strong><span>{item.suburb} · {stageLabels[item.stage]}</span></div><b>→</b>
        </button>)}
      </aside>

      {selected ? <div className={styles.caseWorkspace}>
        <section className={styles.caseHero}>
          <div><span>{selected.requestCode}</span><h3>{selected.service}</h3><p>{selected.description}</p></div>
          <dl><div><dt>Customer</dt><dd>{selected.customerName}</dd></div><div><dt>Project</dt><dd>{selected.projectCode || "Created after Admin approval"}</dd></div><div><dt>Current stage</dt><dd>{stageLabels[selected.stage]}</dd></div><div><dt>Site Supervisor</dt><dd>{selected.assignedSupervisorName || "Not assigned"}</dd></div></dl>
        </section>

        <section className={styles.journey} aria-label="Project workflow stages">
          {journey.map((stage, index) => <div className={index < progress ? styles.done : index === progress ? styles.current : ""} key={stage}><i>{index < progress ? "✓" : index + 1}</i><span>{stageLabels[stage]}</span></div>)}
        </section>

        {role === "admin" && <section className={styles.actionPanel}>
          <header><div><span>ADMIN CONTROL</span><h3>Move this request to the next safe stage</h3></div><b>{stageLabels[selected.stage]}</b></header>
          {selected.stage === "request_submitted" && <button disabled={working} onClick={() => void action("review_started", {}, "Request moved into Admin review.")}>Start Admin review <span>→</span></button>}
          {["request_submitted", "admin_review"].includes(selected.stage) && <form onSubmit={(event) => { event.preventDefault(); void action("customer_contacted", { note: contactNote }, "Customer contact recorded."); }}><label><span>Customer contact note</span><textarea value={contactNote} onChange={(event) => setContactNote(event.target.value)} placeholder="Record the call, email or information requested…" required /></label><button disabled={working}>Save contact & continue</button></form>}
          {["admin_review", "customer_contacted"].includes(selected.stage) && <button disabled={working} onClick={() => void action("approve_intake", {}, "Project folder created and ready for Site Visit assignment.")}>Approve intake & create project folder <span>→</span></button>}
          {["site_visit_ready", "site_visit_scheduled", "visit_changes_requested"].includes(selected.stage) && <form onSubmit={(event) => { event.preventDefault(); void action("assign_visit", { supervisorEmail: selectedSupervisor?.email, supervisorName: selectedSupervisor?.name, visitAt }, "Site Visit assigned to the Site Supervisor."); }}><div className={styles.twoFields}><label><span>Site Supervisor</span><select value={supervisorEmail} onChange={(event) => setSupervisorEmail(event.target.value)}>{data.supervisors.map((item) => <option key={item.email} value={item.email}>{item.name} · {item.email}</option>)}</select></label><label><span>Visit date & time</span><input type="datetime-local" value={visitAt} onChange={(event) => setVisitAt(event.target.value)} required /></label></div><button disabled={working}>Assign Site Visit</button></form>}
          {selected.stage === "site_visit_submitted" && <div className={styles.reviewBox}><div><strong>{selected.visitReport?.summary}</strong><p>{selected.visitReport?.findings}</p><small>{selected.visitReport?.recommendations}</small></div><label><span>Admin review note</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label><div><button disabled={working} onClick={() => void action("review_site_visit", { decision: "changes_requested", note: reviewNote }, "Site Visit returned to the Site Supervisor.")}>Request changes</button><button disabled={working} onClick={() => void action("review_site_visit", { decision: "approved", note: reviewNote }, "Site Visit approved. Estimate can now be prepared.")}>Approve Site Visit</button></div></div>}
          {["site_visit_approved", "estimate_ready"].includes(selected.stage) && <form onSubmit={(event) => { event.preventDefault(); void action("save_estimate", estimateForm, "Estimate saved internally."); }}><div className={styles.twoFields}><label><span>Estimate total (AUD)</span><input type="number" min="1" value={estimateForm.amount} onChange={(event) => setEstimateForm((form) => ({ ...form, amount: event.target.value }))} required /></label><label><span>Terms</span><input value={estimateForm.terms} onChange={(event) => setEstimateForm((form) => ({ ...form, terms: event.target.value }))} /></label></div><label><span>Scope included</span><textarea value={estimateForm.scope} onChange={(event) => setEstimateForm((form) => ({ ...form, scope: event.target.value }))} required /></label><button disabled={working}>Save estimate</button></form>}
          {selected.stage === "estimate_ready" && <button disabled={working} onClick={() => void action("send_estimate", {}, "Estimate sent to the Customer portal.")}>Send estimate to Customer <span>→</span></button>}
          {selected.stage === "estimate_sent" && <p className={styles.waiting}>Waiting for the Customer to accept or decline the estimate in their portal.</p>}
          {selected.stage === "customer_approved" && <button disabled={working} onClick={() => void action("activate_project", {}, "Customer-approved work is now an active project.")}>Confirm approval & activate project <span>→</span></button>}
          {selected.stage === "quality_inspection" && <div className={styles.reviewBox}><div><strong>{selected.qualityInspection?.summary}</strong><p>{selected.qualityInspection?.defects || "No defects recorded by the Site Supervisor."}</p></div><label><span>Admin quality note</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label><div><button disabled={working} onClick={() => void action("review_quality_inspection", { decision: "changes_requested", note: reviewNote }, "Rectification returned to the Site Supervisor.")}>Request rectification</button><button disabled={working} onClick={() => void action("review_quality_inspection", { decision: "approved", note: reviewNote }, "Quality inspection approved for Owner completion.")}>Approve quality inspection</button></div></div>}
          {selected.updates.filter((update) => update.status === "pending_admin").map((update) => <article className={styles.updateApproval} key={update.id}><span>Customer update waiting for Admin</span><strong>{update.customerUpdate}</strong><p>Internal: {update.internalUpdate}</p><div><button onClick={() => void action("reject_update", { updateId: update.id, note: reviewNote || "Please revise the customer update." }, "Update returned to Site Supervisor.")}>Return</button><button onClick={() => void action("admin_approve_update", { updateId: update.id, note: reviewNote }, "Admin approved the update. Owner approval is next.")}>Approve for Owner</button></div></article>)}
        </section>}

        {role === "supervisor" && <section className={styles.actionPanel}>
          <header><div><span>SITE SUPERVISOR WORKSPACE</span><h3>Site evidence and two-level reporting</h3></div><b>{stageLabels[selected.stage]}</b></header>
          {["site_visit_scheduled", "visit_changes_requested"].includes(selected.stage) && <form onSubmit={(event: FormEvent) => { event.preventDefault(); void action("submit_site_visit", { ...visitForm, fileIds: sitePhotoIds }, "Site Visit report submitted to Admin."); }}>
            <div className={styles.uploadBox}><input type="file" accept="image/*" onChange={(event) => void upload("site_visit", event.target.files?.[0])} /><strong>Upload mandatory Site Visit photos</strong><span>{sitePhotoIds.length} photo(s) ready for this report</span></div>
            <div className={styles.twoFields}><label><span>Visit date</span><input type="date" value={visitForm.visitDate} onChange={(event) => setVisitForm((form) => ({ ...form, visitDate: event.target.value }))} required /></label><label><span>Visit summary</span><input value={visitForm.summary} onChange={(event) => setVisitForm((form) => ({ ...form, summary: event.target.value }))} required /></label></div>
            <label><span>Important findings</span><textarea value={visitForm.findings} onChange={(event) => setVisitForm((form) => ({ ...form, findings: event.target.value }))} required /></label>
            <label><span>Recommendations to Admin</span><textarea value={visitForm.recommendations} onChange={(event) => setVisitForm((form) => ({ ...form, recommendations: event.target.value }))} required /></label>
            <label><span>Internal notes</span><textarea value={visitForm.internalNotes} onChange={(event) => setVisitForm((form) => ({ ...form, internalNotes: event.target.value }))} /></label>
            <button disabled={working}>Submit Site Visit to Admin</button>
          </form>}
          {selected.stage === "active_project" && <form onSubmit={(event: FormEvent) => { event.preventDefault(); void action("submit_progress_update", { ...updateForm, fileIds: progressPhotoIds }, "Internal and customer updates sent for approval."); }}>
            <div className={styles.uploadBox}><input type="file" accept="image/*" onChange={(event) => void upload("progress", event.target.files?.[0])} /><strong>Upload today&apos;s mandatory progress photos</strong><span>{progressPhotoIds.length} photo(s) ready</span></div>
            <label><span>Work date</span><input type="date" value={updateForm.workDate} onChange={(event) => setUpdateForm((form) => ({ ...form, workDate: event.target.value }))} required /></label>
            <label><span>Internal team update · Owner, Admin and Manager only</span><textarea value={updateForm.internalUpdate} onChange={(event) => setUpdateForm((form) => ({ ...form, internalUpdate: event.target.value }))} placeholder="Work completed, issues, delays, safety, trade coordination and tomorrow's needs…" required /></label>
            <label><span>Customer update · hidden until Admin + Owner approval</span><textarea value={updateForm.customerUpdate} onChange={(event) => setUpdateForm((form) => ({ ...form, customerUpdate: event.target.value }))} placeholder="Clear customer-safe progress update without internal notes or pricing…" required /></label>
            <button disabled={working}>Submit both updates for approval</button>
          </form>}
          {selected.stage === "active_project" && <form onSubmit={(event: FormEvent) => { event.preventDefault(); void action("submit_quality_inspection", { ...qualityForm, fileIds: progressPhotoIds }, "Quality inspection sent to Admin."); }}>
            <div className={styles.uploadBox}><input type="file" accept="image/*" onChange={(event) => void upload("quality", event.target.files?.[0])} /><strong>Upload completion and quality evidence</strong><span>{progressPhotoIds.length} photo(s) ready</span></div>
            <label><span>Inspection date</span><input type="date" value={qualityForm.inspectedAt} onChange={(event) => setQualityForm((form) => ({ ...form, inspectedAt: event.target.value }))} required /></label>
            <label><span>Quality inspection summary</span><textarea value={qualityForm.summary} onChange={(event) => setQualityForm((form) => ({ ...form, summary: event.target.value }))} placeholder="Work inspected, tests completed and handover readiness…" required /></label>
            <label><span>Defects or rectification items</span><textarea value={qualityForm.defects} onChange={(event) => setQualityForm((form) => ({ ...form, defects: event.target.value }))} placeholder="Leave blank only when no defects were identified." /></label>
            <button disabled={working}>Submit quality inspection</button>
          </form>}
          {["site_visit_submitted", "site_visit_approved", "estimate_ready", "estimate_sent", "customer_approved"].includes(selected.stage) && <p className={styles.waiting}>Your Site Visit is complete. Admin is handling the estimate and Customer approval stages.</p>}
        </section>}

        {role === "owner" && <section className={styles.actionPanel}>
          <header><div><span>OWNER AUTHORITY</span><h3>Publication and complete oversight</h3></div><b>{data.events.length} recorded events</b></header>
          {selected.updates.filter((update) => update.status === "pending_owner").map((update) => <article className={styles.updateApproval} key={update.id}><span>Admin approved · Owner decision required</span><strong>{update.customerUpdate}</strong><p>Internal: {update.internalUpdate}</p><div><button onClick={() => void action("reject_update", { updateId: update.id, note: reviewNote || "Please revise before publication." }, "Update returned for changes.")}>Return</button><button onClick={() => void action("owner_approve_update", { updateId: update.id, note: reviewNote }, "Update published to the Customer portal.")}>Approve & publish</button></div></article>)}
          {!selected.updates.some((update) => update.status === "pending_owner") && <p className={styles.waiting}>No customer update is waiting for Owner approval on this project.</p>}
          {selected.stage === "completion_ready" && <div className={styles.reviewBox}><div><strong>Quality inspection approved by Admin</strong><p>{selected.qualityInspection?.summary}</p><small>{selected.qualityInspection?.defects || "No outstanding defects recorded."}</small></div><label><span>Owner completion note</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label><div><button disabled={working} onClick={() => void action("complete_project", { note: reviewNote }, "Project completed and customer status updated.")}>Owner approve & complete project</button></div></div>}
        </section>}

        <div className={styles.lowerGrid}>
          <section className={styles.filesPanel}><header><span>PROJECT EVIDENCE</span><strong>{selected.files.length} files</strong></header><div>{selected.files.length ? selected.files.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}><span>{file.mimeType.startsWith("image/") ? "PHOTO" : "FILE"}</span><strong>{file.fileName}</strong><small>{file.category.replace("_", " ")} · {file.visibility}</small></a>) : <p>No photos uploaded yet.</p>}</div></section>
          <section className={styles.activityPanel}><header><span>OWNER ACTIVITY FEED</span><strong>Everything recorded</strong></header><ol>{selectedEvents.map((item) => <li key={item.id}><i /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.actorRole} · {when(item.createdAt)}</small></div></li>)}</ol></section>
        </div>
      </div> : <div className={styles.empty}><strong>No project workflow is assigned to this role.</strong><span>Admin can assign a Site Visit after the project folder is created.</span></div>}
    </div>
  </section>;
}

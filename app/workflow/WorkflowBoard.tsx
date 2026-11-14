"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EstimateCalculator from "./EstimateCalculator";
import { CopyCustomerLink, NewProjectPanel, StageAndCustomerPanel } from "./ProjectControls";
import { newClientKey } from "./client-key";
import { stageLabels, type WorkflowRole, type WorkflowSnapshot } from "./types";
import styles from "./workflow.module.css";

const empty: WorkflowSnapshot = { cases: [], events: [], supervisors: [], role: "admin" };
const journey = ["request_submitted", "admin_review", "customer_contacted", "site_visit_scheduled", "site_visit_submitted", "site_visit_approved", "estimate_ready", "estimate_sent", "customer_approved", "active_project", "quality_inspection", "completion_ready", "complete"] as const;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date());
// Access refused: the Owner's switch (403), or the sign-in ended / the role changed (401).
const refused = (status: number) => status === 401 || status === 403;

function when(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function currentJourneyIndex(stage: string) {
  if (stage === "visit_changes_requested") return 4;
  if (stage === "estimate_declined") return 7;
  if (stage === "complete") return journey.length - 1;
  if (stage === "closed") return 0;
  return journey.indexOf(stage as (typeof journey)[number]);
}

export default function WorkflowBoard({ role }: { role: WorkflowRole }) {
  const [data, setData] = useState<WorkflowSnapshot>({ ...empty, role });
  const [selectedId, setSelectedId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [accessOff, setAccessOff] = useState(false);
  const [contactNote, setContactNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [visitAt, setVisitAt] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [visitForm, setVisitForm] = useState({ visitDate: today(), summary: "", findings: "", recommendations: "", internalNotes: "" });
  const [estimateForm] = useState({ amount: "", scope: "", terms: "Final price and variations are governed by the signed contract and applicable Victorian law." });
  const [updateForm, setUpdateForm] = useState({ workDate: today(), internalUpdate: "", customerUpdate: "" });
  const [qualityForm, setQualityForm] = useState({ inspectedAt: today(), summary: "", defects: "" });
  const [sitePhotoIds, setSitePhotoIds] = useState<number[]>([]);
  const [progressPhotoIds, setProgressPhotoIds] = useState<number[]>([]);
  const [closeNote, setCloseNote] = useState("");
  const [changeForm, setChangeForm] = useState({ title: "", detail: "" });
  // Messages being typed to customers are kept per project, so a half-written message can never be sent to another customer.
  const [messageDrafts, setMessageDrafts] = useState<Record<number, { body: string; docs: boolean; key?: string }>>({});
  const [formsFor, setFormsFor] = useState(0);
  // The site visit report the Site Supervisor's form was opened on ("" = none yet). Sending names it, so a report sent meanwhile from
  // another screen is never overwritten with this form's text; it moves on only with this form's own successful send.
  const [visitOpened, setVisitOpened] = useState("");
  // The same for the quality inspection form.
  const [qualityOpened, setQualityOpened] = useState("");
  const [newProject, setNewProject] = useState(false);
  // The access details of a project just created, exactly as the server returned them (never looked up from a list that may be stale).
  const [justCreated, setJustCreated] = useState<{ caseId: number; requestCode: string; projectCode: string } | null>(null);
  // Every change and every full reload moves this on; a quiet refresh that started before it is thrown away when it arrives, so an older
  // list can never replace a newer one (and, for example, put another customer's link next to a project just created).
  const generation = useRef(0);
  // Moves on each time the Owner's switch locks this Admin out. Any answer to a request sent before that (a slow save, a project being
  // created, a reload) is thrown away when it arrives, so nothing private comes back onto a locked screen.
  const accessEpoch = useRef(0);
  const newProjectEpoch = useRef(0);
  const createStartedAt = useRef(0);
  const management = role === "owner" || role === "admin";
  const router = useRouter();

  // Access ended: the Owner switched off this Admin's project access (403), or the sign-in ended or the role changed (401). Nothing already
  // on screen stays visible, nothing still on its way is shown, and after a 401 the page re-checks the sign-in (and moves the person on).
  const lockedOut = useCallback((message?: string, signedOut = false) => {
    accessEpoch.current += 1; generation.current += 1;
    setData({ ...empty, role }); setSelectedId(0); setAccessOff(true); setNewProject(false); setJustCreated(null); setMessageDrafts({});
    setError(message || (signedOut ? "Your sign-in has ended or your role has changed. Please sign in again." : "Project access has been disabled by Owner."));
    if (signedOut) router.refresh();
  }, [role, router]);

  // Reads the board without the loading screen. Applied only if nothing newer reached the screen meanwhile (and no lock happened).
  const refreshQuietly = useCallback(() => {
    const startedAt = generation.current;
    const epoch = accessEpoch.current;
    void fetch(`/api/workflow?previewRole=${role}`, { cache: "no-store" })
      .then(async (response) => {
        if (refused(response.status)) { lockedOut(((await response.json().catch(() => ({}))) as { error?: string }).error, response.status === 401); return undefined; }
        return response.ok ? (await response.json() as { data?: WorkflowSnapshot }).data : undefined;
      })
      .then((fresh) => { if (fresh && generation.current === startedAt && epoch === accessEpoch.current) { generation.current += 1; setAccessOff(false); setData(fresh); } })
      .catch(() => undefined);
  }, [role, lockedOut]);

  async function load() {
    const epoch = accessEpoch.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/workflow?previewRole=${role}`, { cache: "no-store" });
      const result = await response.json() as { data?: WorkflowSnapshot; error?: string };
      if (refused(response.status)) { lockedOut(result.error, response.status === 401); return; }
      if (epoch !== accessEpoch.current) return;
      if (!response.ok || !result.data) throw new Error(result.error ?? "Project workflow could not be loaded.");
      generation.current += 1;
      setAccessOff(false);
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
    const epoch = accessEpoch.current;
    void fetch(`/api/workflow?previewRole=${role}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { data?: WorkflowSnapshot; error?: string } }))
      .then(({ response, result }) => {
        if (refused(response.status) && active) { setAccessOff(true); if (response.status === 401) router.refresh(); }
        if (!response.ok || !result.data) throw new Error(result.error ?? "Project workflow could not be loaded.");
        if (!active || epoch !== accessEpoch.current) return;
        generation.current += 1;
        setData(result.data);
        setSelectedId(result.data.cases[0]?.id ?? 0);
        if (result.data.supervisors[0]) setSupervisorEmail(result.data.supervisors[0].email);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Project workflow could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role, router]);

  // New customer messages and changes made by others appear without reloading: a quiet refresh every 30 seconds while the page is in view.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshQuietly();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refreshQuietly]);

  // A project that was explicitly chosen but is not in the current list shows nothing (never another customer's project in its place).
  const selected = useMemo(() => data.cases.find((item) => item.id === selectedId) ?? (selectedId ? null : data.cases[0] ?? null), [data.cases, selectedId]);
  const draftKey = selected?.id ?? 0;
  const customerMessage = messageDrafts[draftKey]?.body ?? "";
  const requestDocs = messageDrafts[draftKey]?.docs ?? false;
  // Changing the text makes it a new message with a new key (a key always belongs to exactly one text).
  const setCustomerMessage = (body: string) => setMessageDrafts((all) => ({ ...all, [draftKey]: { body, docs: all[draftKey]?.docs ?? false, key: all[draftKey]?.body === body ? all[draftKey]?.key : undefined } }));
  // Ticking or unticking "request documents" also makes it a different message (the server checks text and kind), so it gets a new key.
  const setRequestDocs = (docs: boolean) => setMessageDrafts((all) => ({ ...all, [draftKey]: { ...all[draftKey], body: all[draftKey]?.body ?? "", docs, key: (all[draftKey]?.docs ?? false) === docs ? all[draftKey]?.key : undefined } }));
  // Sends this project's message with its one-time key (kept for a retry, renewed once saved) and clears only the text that was sent.
  function sendCustomerMessage() {
    const caseKey = draftKey;
    const body = customerMessage;
    const docs = requestDocs;
    const key = messageDrafts[caseKey]?.key ?? newClientKey();
    setMessageDrafts((all) => ({ ...all, [caseKey]: { ...all[caseKey], body: all[caseKey]?.body ?? body, docs: all[caseKey]?.docs ?? docs, key } }));
    void action("message_customer", { body, kind: docs ? "document_request" : "message", clientKey: key }, docs ? "Document request sent to the customer portal." : "Message sent to the customer portal.").then((sent) => {
      if (!sent) return;
      setMessageDrafts((all) => {
        const current = all[caseKey];
        return { ...all, [caseKey]: current && current.body === body && (current.docs ?? false) === docs ? { body: "", docs: false, key: newClientKey() } : { ...current, body: current?.body ?? "", docs: current?.docs ?? false, key: newClientKey() } };
      });
    });
  }
  // Every other form on the board belongs to the project it was filled in for: switching project (or opening a new one) starts them empty,
  // so a note, a change proposal or photos chosen for one customer can never be submitted on another's project.
  if (selected && selected.id !== formsFor) {
    setFormsFor(selected.id);
    setContactNote(""); setReviewNote(""); setVisitAt(""); setCloseNote(""); setChangeForm({ title: "", detail: "" });
    setSitePhotoIds([]); setProgressPhotoIds([]);
    setVisitForm({ visitDate: today(), summary: "", findings: "", recommendations: "", internalNotes: "" });
    setVisitOpened(selected.visitReport?.revision ?? "");
    setQualityOpened(selected.qualityInspection?.revision ?? "");
    setUpdateForm({ workDate: today(), internalUpdate: "", customerUpdate: "" });
    setQualityForm({ inspectedAt: today(), summary: "", defects: "" });
  }
  const selectedEvents = useMemo(() => data.events.filter((item) => item.caseId === selected?.id), [data.events, selected]);
  const queue = role === "owner"
    ? data.cases.flatMap((item) => item.updates.filter((update) => update.status === "pending_owner"))
    : role === "estimator"
      ? data.cases.filter((item) => item.stage === "site_visit_approved" || item.stage === "estimate_declined")
    : role === "admin"
      ? data.cases.filter((item) => ["request_submitted", "site_visit_submitted", "estimate_ready", "customer_approved"].includes(item.stage)).concat(data.cases.filter((item) => item.updates.some((update) => update.status === "pending_admin")))
      : data.cases;

  async function action(name: string, payload: Record<string, unknown> = {}, success = "Workflow updated."): Promise<{ revision?: string } | false> {
    if (!selected) return false;
    const epoch = accessEpoch.current;
    const startedGen = generation.current;
    setWorking(true); setError("");
    try {
      const response = await fetch(`/api/workflow?previewRole=${role}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, caseId: selected.id, payload }) });
      const result = await response.json().catch(() => ({})) as { data?: WorkflowSnapshot | null; error?: string; revision?: string };
      if (refused(response.status)) { lockedOut(result.error, response.status === 401); return false; }
      if (epoch !== accessEpoch.current) return false;
      // Refused because something changed meanwhile: the board is re-read, so the newer version (and the choice to replace it) is shown.
      if (response.status === 409) refreshQuietly();
      if (!response.ok) throw new Error(result.error ?? "The action could not be completed.");
      // Saved. The answer normally carries the fresh board. If something newer reached the screen while this was on its way (another save,
      // a project just created), or the answer has no board, the board is re-read quietly instead, so neither change is hidden.
      const newest = generation.current === startedGen;
      generation.current += 1;
      if (result.data && newest) setData(result.data); else refreshQuietly();
      setNotice(success); window.setTimeout(() => setNotice(""), 3600);
      // A report uses the photos chosen for it; the next one starts with none (they used to be re-sent with the next report).
      if (name.startsWith("submit_")) { setSitePhotoIds([]); setProgressPhotoIds([]); }
      // A saved estimate's version, so the calculator keeps working on exactly what it saved.
      return { revision: typeof result.revision === "string" ? result.revision : undefined };
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The action could not be completed."); return false; }
    finally { setWorking(false); }
  }

  async function upload(category: "site_visit" | "progress" | "quality" | "document", file?: File) {
    if (!selected || !file) return;
    const epoch = accessEpoch.current;
    setWorking(true); setError("");
    try {
      const form = new FormData(); form.set("caseId", String(selected.id)); form.set("category", category); form.set("file", file);
      const response = await fetch(`/api/workflow/files?previewRole=${role}`, { method: "POST", body: form });
      const result = await response.json() as { data?: { id: number; fileName: string }; error?: string };
      if (refused(response.status)) { lockedOut(result.error, response.status === 401); return; }
      if (epoch !== accessEpoch.current) return;
      if (!response.ok || !result.data) throw new Error(result.error ?? "Upload failed.");
      if (category === "site_visit") setSitePhotoIds((ids) => [...ids, result.data!.id]);
      else if (category === "progress" || category === "quality") setProgressPhotoIds((ids) => [...ids, result.data!.id]);
      setNotice(`${result.data.fileName} added to ${selected.projectCode || selected.requestCode}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed."); }
    finally { setWorking(false); }
  }

  const selectedSupervisor = data.supervisors.find((item) => item.email === supervisorEmail) ?? data.supervisors[0];
  const progress = selected ? Math.max(0, currentJourneyIndex(selected.stage)) : 0;

  if (loading) return <section className={styles.loading}><i />Opening the live project workflow…</section>;

  return <section className={styles.workflowShell}>
    <div className={styles.workflowHeader}>
      <div><span>REQUEST → SITE VISIT → ESTIMATE → DELIVERY → QUALITY → COMPLETE</span><h2>Project workflow control</h2><p>Every hand-off is recorded. Customer updates stay private until Admin and Owner approve them.</p></div>
      <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
        <div className={styles.roleBadge}><i />{role === "supervisor" ? "Site Supervisor" : role[0].toUpperCase() + role.slice(1)} workspace</div>
        {management && !newProject && !accessOff && <button type="button" className={styles.toolButton} onClick={() => { newProjectEpoch.current = accessEpoch.current; setNewProject(true); }}>+ New project for a customer</button>}
      </div>
    </div>
    {management && newProject && <NewProjectPanel stageOptions={data.stageOptions ?? []} onCancel={() => setNewProject(false)} onSubmitting={() => { createStartedAt.current = generation.current; }} onCreated={(created, snapshot) => {
      // Created before the Owner switched this Admin's access off: the private link is not shown.
      if (newProjectEpoch.current !== accessEpoch.current) return;
      const newest = generation.current === createStartedAt.current;
      generation.current += 1;
      if (snapshot && newest) setData(snapshot); else refreshQuietly();
      setSelectedId(created.caseId); setNewProject(false); setJustCreated(created);
      setNotice(`Project created${created.projectCode ? ` (${created.projectCode})` : ""}.`);
    }} />}
    {management && justCreated && !accessOff && <section className={styles.actionPanel} aria-label="Project created">
      <header><div><span>PROJECT CREATED{justCreated.projectCode ? ` · ${justCreated.projectCode}` : ""}</span><h3>Send this private link to the customer</h3></div><button type="button" onClick={() => setJustCreated(null)}>Done</button></header>
      <CopyCustomerLink requestCode={justCreated.requestCode} />
    </section>}
    {(notice || error) && <div className={`${styles.notice} ${error ? styles.error : ""}`}><strong>{error ? "Action stopped" : "Saved"}</strong><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}

    <div className={styles.summaryStrip}>
      <article><span>Workflow cases</span><strong>{data.cases.length}</strong><small>Visible to this role</small></article>
      <article><span>Action queue</span><strong>{queue.length}</strong><small>Waiting for your role</small></article>
      <article><span>Customer updates</span><strong>{data.cases.flatMap((item) => item.updates).filter((item) => item.status === "published").length}</strong><small>Approved and published</small></article>
      <article><span>{role === "owner" ? "Owner audit events" : "Activity events"}</span><strong>{data.events.length}</strong><small>{role === "owner" ? "Complete activity record" : "Visible to this role"}</small></article>
    </div>

    <div className={styles.workspaceGrid}>
      <aside className={styles.caseList}>
        <header><span>Project pipeline</span><strong>{data.cases.length} records</strong></header>
        {data.cases.map((item) => <button className={selected?.id === item.id ? styles.selectedCase : ""} key={item.id} onClick={() => setSelectedId(item.id)}>
          <i className={styles.stageDot} /><div><small>{item.projectCode || item.requestCode}</small><strong>{item.service}</strong><span>{item.suburb} · {item.view?.statusLabel || stageLabels[item.stage]}</span></div><b>→</b>
        </button>)}
      </aside>

      {selected ? <div className={styles.caseWorkspace}>
        <section className={styles.caseHero}>
          <div><span>{selected.projectCode || selected.requestCode}</span><h3>{selected.service}</h3><p>{selected.description}</p></div>
          <dl><div><dt>Customer</dt><dd>{selected.customerName}</dd></div><div><dt>Project</dt><dd>{selected.projectCode || "Created after Admin approval"}</dd></div><div><dt>Current stage</dt><dd>{selected.view?.statusLabel ? <>{selected.view.statusLabel}<br /><small>Workflow step: {stageLabels[selected.stage]}</small></> : stageLabels[selected.stage]}</dd></div><div><dt>Site Supervisor</dt><dd>{selected.assignedSupervisorName || "Not assigned"}</dd></div></dl>
        </section>

        {management && <CopyCustomerLink requestCode={selected.requestCode} />}
        {management && <StageAndCustomerPanel key={selected.id} selected={selected} stageOptions={data.stageOptions ?? []} act={async (name, payload, success) => Boolean(await action(name, payload, success))} working={working} />}

        <section className={styles.journey} aria-label="Project workflow stages">
          {journey.map((stage, index) => <div className={index < progress ? styles.done : index === progress ? styles.current : ""} key={stage}><i>{index < progress ? "✓" : index + 1}</i><span>{stageLabels[stage]}</span></div>)}
        </section>

        {role === "admin" && <section className={styles.actionPanel}>
          <header><div><span>ADMIN CONTROL</span><h3>Move this request to the next safe stage</h3></div><b>{stageLabels[selected.stage]}</b></header>
          {selected.stage === "request_submitted" && <button disabled={working} onClick={() => void action("review_started", {}, "Request moved into Admin review.")}>Start Admin review <span>→</span></button>}
          {["request_submitted", "admin_review"].includes(selected.stage) && <form onSubmit={(event) => { event.preventDefault(); void action("customer_contacted", { note: contactNote }, "Customer contact recorded."); }}><label><span>Customer contact note</span><textarea value={contactNote} onChange={(event) => setContactNote(event.target.value)} placeholder="Record the call, email or information requested…" required /></label><button disabled={working}>Save contact & continue</button></form>}
          {["admin_review", "customer_contacted"].includes(selected.stage) && <button disabled={working} onClick={() => void action("approve_intake", {}, "Project folder created and ready for Site Visit assignment.")}>Approve intake & create project folder <span>→</span></button>}
          {["site_visit_ready", "site_visit_scheduled", "visit_changes_requested"].includes(selected.stage) && <form onSubmit={(event) => { event.preventDefault(); void action("assign_visit", { supervisorEmail: selectedSupervisor?.email, supervisorName: selectedSupervisor?.name, visitAt }, "Site Visit assigned to the Site Supervisor."); }}><div className={styles.twoFields}><label><span>Site Supervisor</span><select value={supervisorEmail} onChange={(event) => setSupervisorEmail(event.target.value)}>{data.supervisors.map((item) => <option key={item.email} value={item.email}>{item.name} · {item.email}</option>)}</select></label><label><span>Visit date & time</span><input type="datetime-local" value={visitAt} onChange={(event) => setVisitAt(event.target.value)} required /></label></div><button disabled={working}>Assign Site Visit</button></form>}
          {["site_visit_scheduled", "visit_changes_requested", "active_project", "quality_inspection"].includes(selected.stage) && <form onSubmit={(event) => { event.preventDefault(); void action("reassign_supervisor", { supervisorEmail: selectedSupervisor?.email, supervisorName: selectedSupervisor?.name }, "Site Supervisor changed."); }}><div className={styles.twoFields}><label><span>Change Site Supervisor (now {selected.assignedSupervisorName || selected.assignedSupervisorEmail || "none"})</span><select value={supervisorEmail} onChange={(event) => setSupervisorEmail(event.target.value)}>{data.supervisors.map((item) => <option key={item.email} value={item.email}>{item.name} · {item.email}</option>)}</select></label></div><button disabled={working}>Hand the job to this Site Supervisor</button></form>}
          {selected.stage === "site_visit_submitted" && <div className={styles.reviewBox}><div><strong>{selected.visitReport?.summary}</strong><p>{selected.visitReport?.findings}</p><small>{selected.visitReport?.recommendations}</small></div><label><span>Admin review note</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label><div><button disabled={working} onClick={() => void action("review_site_visit", { decision: "changes_requested", note: reviewNote, revision: selected.visitReport?.revision ?? "" }, "Site Visit returned to the Site Supervisor.")}>Request changes</button><button disabled={working} onClick={() => void action("review_site_visit", { decision: "approved", note: reviewNote, revision: selected.visitReport?.revision ?? "" }, "Site Visit approved. Estimate can now be prepared.")}>Approve Site Visit</button></div></div>}
          {selected.stage === "site_visit_approved" && <p className={styles.waiting}>Site visit approved. The Estimator now prices this job from the photos and measurements; it returns here for you to send to the customer.</p>}
          {selected.stage === "estimate_ready" && selected.estimate && <div className={styles.reviewBox}><div><strong>Estimate approved by the Estimator: {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(selected.estimate.amountCents / 100)}</strong><p style={{ whiteSpace: "pre-wrap" }}>{selected.estimate.scope}</p><small>{selected.estimate.terms}</small><small style={{ display: "block", marginTop: 6 }}>This is exactly what the customer will read.</small>{selected.estimate.breakdown && <details style={{ marginTop: 8 }}><summary>Priced working — Owner and Admin only</summary><p style={{ whiteSpace: "pre-wrap" }}>{selected.estimate.breakdown}</p></details>}</div></div>}
          {selected.stage === "estimate_ready" && <button disabled={working} onClick={() => void action("send_estimate", { revision: selected.estimate?.revision ?? "", amountCents: selected.estimate?.amountCents ?? 0, scope: selected.estimate?.scope ?? "" }, "Estimate sent to the Customer portal.")}>Send estimate to Customer <span>→</span></button>}
          {selected.stage === "estimate_sent" && <p className={styles.waiting}>Waiting for the Customer to accept or decline the estimate in their portal.</p>}
          {selected.stage === "customer_approved" && <button disabled={working} onClick={() => void action("activate_project", {}, "Customer-approved work is now an active project.")}>Confirm approval & activate project <span>→</span></button>}
          {selected.stage === "quality_inspection" && <div className={styles.reviewBox}><div><strong>{selected.qualityInspection?.summary}</strong><p>{selected.qualityInspection?.defects || "No defects recorded by the Site Supervisor."}</p></div><label><span>Admin quality note</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label><div><button disabled={working} onClick={() => void action("review_quality_inspection", { decision: "changes_requested", note: reviewNote, revision: selected.qualityInspection?.revision ?? "" }, "Rectification returned to the Site Supervisor.")}>Request rectification</button><button disabled={working} onClick={() => void action("review_quality_inspection", { decision: "approved", note: reviewNote, revision: selected.qualityInspection?.revision ?? "" }, "Quality inspection approved for Owner completion.")}>Approve quality inspection</button></div></div>}
          {selected.updates.filter((update) => update.status === "pending_admin").map((update) => <article className={styles.updateApproval} key={update.id}><span>Customer update waiting for Admin</span><strong>{update.customerUpdate}</strong><p>Internal: {update.internalUpdate}</p><div><button onClick={() => void action("reject_update", { updateId: update.id, note: reviewNote || "Please revise the customer update." }, "Update returned to Site Supervisor.")}>Return</button><button onClick={() => void action("admin_approve_update", { updateId: update.id, note: reviewNote }, "Admin approved the update. Owner approval is next.")}>Approve for Owner</button></div></article>)}
        </section>}

        {role === "supervisor" && <section className={styles.actionPanel}>
          <header><div><span>SITE SUPERVISOR WORKSPACE</span><h3>Site evidence and two-level reporting</h3></div><b>{stageLabels[selected.stage]}</b></header>
          {["site_visit_scheduled", "visit_changes_requested"].includes(selected.stage) && <form onSubmit={(event: FormEvent) => { event.preventDefault(); void (async () => { const sent = await action("submit_site_visit", { ...visitForm, fileIds: sitePhotoIds, replacing: visitOpened }, "Site Visit report submitted to Admin."); if (sent && sent.revision) setVisitOpened(sent.revision); })(); }}>
            {(selected.visitReport?.revision ?? "") !== visitOpened && <div role="alert" className={styles.waiting} style={{ border: "1px solid rgba(255,120,90,.6)" }}>A newer site visit report was sent for this job from another screen. Your text below is kept. Check the newer report first; sending now is refused unless you choose to replace it. <button type="button" onClick={() => setVisitOpened(selected.visitReport?.revision ?? "")}>Replace it with my report</button></div>}
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
          {selected.stage === "active_project" && <form onSubmit={(event: FormEvent) => { event.preventDefault(); void (async () => { const sent = await action("submit_quality_inspection", { ...qualityForm, fileIds: progressPhotoIds, replacing: qualityOpened }, "Quality inspection sent to Admin."); if (sent && sent.revision) setQualityOpened(sent.revision); })(); }}>
            {(selected.qualityInspection?.revision ?? "") !== qualityOpened && <div role="alert" className={styles.waiting} style={{ border: "1px solid rgba(255,120,90,.6)" }}>A newer quality inspection was sent for this job from another screen. Your text below is kept. Check the newer inspection first; sending now is refused unless you choose to replace it. <button type="button" onClick={() => setQualityOpened(selected.qualityInspection?.revision ?? "")}>Replace it with my inspection</button></div>}
            <div className={styles.uploadBox}><input type="file" accept="image/*" onChange={(event) => void upload("quality", event.target.files?.[0])} /><strong>Upload completion and quality evidence</strong><span>{progressPhotoIds.length} photo(s) ready</span></div>
            <label><span>Inspection date</span><input type="date" value={qualityForm.inspectedAt} onChange={(event) => setQualityForm((form) => ({ ...form, inspectedAt: event.target.value }))} required /></label>
            <label><span>Quality inspection summary</span><textarea value={qualityForm.summary} onChange={(event) => setQualityForm((form) => ({ ...form, summary: event.target.value }))} placeholder="Work inspected, tests completed and handover readiness…" required /></label>
            <label><span>Defects or rectification items</span><textarea value={qualityForm.defects} onChange={(event) => setQualityForm((form) => ({ ...form, defects: event.target.value }))} placeholder="Leave blank only when no defects were identified." /></label>
            <button disabled={working}>Submit quality inspection</button>
          </form>}
          {["site_visit_submitted", "site_visit_approved", "estimate_ready", "estimate_sent", "customer_approved"].includes(selected.stage) && <p className={styles.waiting}>Your Site Visit is complete. Admin is handling the estimate and Customer approval stages.</p>}
        </section>}

        {role === "estimator" && <section className={styles.actionPanel}>
          <header><div><span>ESTIMATOR WORKSPACE</span><h3>Price the job from the site evidence</h3></div><b>{stageLabels[selected.stage]}</b></header>
          {selected.visitReport ? <div className={styles.reviewBox}><div><strong>{selected.visitReport.summary}</strong><p>{selected.visitReport.findings}</p><small>Supervisor recommendation: {selected.visitReport.recommendations}</small></div></div> : <p className={styles.waiting}>No site visit report is attached to this project yet.</p>}
          {["site_visit_approved", "estimate_ready", "estimate_declined"].includes(selected.stage) ? <>
            {selected.stage === "estimate_ready" && <p className={styles.waiting}>You already sent an estimate to Admin. You can recalculate and resend it until Admin sends it to the customer.</p>}
            <EstimateCalculator key={selected.id} initialTerms={estimateForm.terms} busy={working} revision={selected.estimate?.revision ?? ""} onSubmit={(payload) => action("save_estimate", payload, "Estimate approved and sent to Admin.")} />
          </> : <p className={styles.waiting}>This estimate is with Admin or the customer. Nothing more is needed from the Estimator at this stage.</p>}
        </section>}

        {role === "owner" && <section className={styles.actionPanel}>
          <header><div><span>OWNER AUTHORITY</span><h3>Publication and complete oversight</h3></div><b>{data.events.length} recorded events</b></header>
          {selected.updates.filter((update) => update.status === "pending_owner").map((update) => <article className={styles.updateApproval} key={update.id}><span>Admin approved · Owner decision required</span><strong>{update.customerUpdate}</strong><p>Internal: {update.internalUpdate}</p><div><button onClick={() => void action("reject_update", { updateId: update.id, note: reviewNote || "Please revise before publication." }, "Update returned for changes.")}>Return</button><button onClick={() => void action("owner_approve_update", { updateId: update.id, note: reviewNote }, "Update published to the Customer portal.")}>Approve & publish</button></div></article>)}
          {!selected.updates.some((update) => update.status === "pending_owner") && <p className={styles.waiting}>No customer update is waiting for Owner approval on this project.</p>}
          {selected.stage === "completion_ready" && <div className={styles.reviewBox}><div><strong>Quality inspection approved by Admin</strong><p>{selected.qualityInspection?.summary}</p><small>{selected.qualityInspection?.defects || "No outstanding defects recorded."}</small></div><label><span>Owner completion note</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} /></label><div><button disabled={working} onClick={() => void action("complete_project", { note: reviewNote }, "Project completed and customer status updated.")}>Owner approve & complete project</button></div></div>}
        </section>}

        {(role === "admin" || role === "owner") && <section className={styles.actionPanel}>
          <header><div><span>PROJECT FOLDER · ADMIN &amp; OWNER ONLY</span><h3>Add documents &amp; close requests</h3></div></header>
          <div className={styles.uploadBox}><input type="file" accept="image/*,application/pdf" aria-label="Choose a photo or PDF to attach" onChange={(event) => void upload("document", event.target.files?.[0])} /><strong>Add a photo or PDF to this project&apos;s folder</strong><span>Invoices, quotes, extra photos — stored internally, never shown to the customer</span></div>
          {!["complete", "closed"].includes(selected.stage) ? <form onSubmit={(event) => { event.preventDefault(); if (window.confirm("Close this request? It will leave the active pipeline and the customer will see it as closed. No records are deleted.")) void action("close_case", { note: closeNote }, "Request closed."); }}>
            <label><span>Reason for closing</span><textarea value={closeNote} onChange={(event) => setCloseNote(event.target.value)} placeholder="e.g. duplicate submission, customer withdrew, test entry…" required /></label>
            <button className={styles.dangerButton} disabled={working}>Close this request</button>
          </form> : <p className={styles.waiting}>{selected.stage === "closed" ? "This request is closed." : "This project is complete."}</p>}
        </section>}

        {(role === "admin" || role === "owner") && <section className={styles.actionPanel}>
          <header><div><span>CUSTOMER COMMUNICATION</span><h3>Message the customer, request documents, propose changes</h3></div></header>
          {selected.messages.length > 0 && <div>{selected.messages.map((message) => <article className={styles.updateApproval} key={message.id}><span>{message.sender === "Admin" ? (message.senderLabel === "Owner" ? "Sent by the Owner" : "Sent by our team") : "Customer replied"}{message.kind === "document_request" ? " · documents requested" : ""} · {when(message.createdAt)}</span><p>{message.body}</p></article>)}</div>}
          {selected.stage !== "closed" && <form onSubmit={(event) => { event.preventDefault(); sendCustomerMessage(); }}>
            <label><span>Message shown in the customer&apos;s portal ({customerMessage.trim().length}/2000)</span><textarea value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} maxLength={2000} placeholder="e.g. Today we completed the framing. Please send the updated floor plan." required /></label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={requestDocs} onChange={(event) => setRequestDocs(event.target.checked)} /><span>This is a request for documents / plans — highlight it for the customer</span></label>
            <button disabled={working || !customerMessage.trim()}>Send to customer</button>
          </form>}
          {selected.stage === "active_project" ? <form onSubmit={(event) => { event.preventDefault(); void action("propose_change", changeForm, "Change proposed to the customer."); setChangeForm({ title: "", detail: "" }); }}>
            <label><span>Change title</span><input value={changeForm.title} onChange={(event) => setChangeForm((form) => ({ ...form, title: event.target.value }))} placeholder="e.g. Move the hot water outlet 300mm left" required /></label>
            <label><span>Details for the customer</span><textarea value={changeForm.detail} onChange={(event) => setChangeForm((form) => ({ ...form, detail: event.target.value }))} placeholder="Explain what's changing and why, so the customer can decide…" required /></label>
            <button disabled={working}>Send to customer for approval</button>
          </form> : <p className={styles.waiting}>Change proposals can be sent once the project is active.</p>}
          {selected.proposals.length > 0 && selected.proposals.map((proposal) => <article className={styles.updateApproval} key={proposal.id}>
            <span>{proposal.status === "accepted" ? "Customer approved"
              : proposal.status === "declined" ? "Customer declined"
              : proposal.status === "withdrawn" ? "Withdrawn (no customer decision)"
              : proposal.status === "sent" && ["quality_inspection", "completion_ready"].includes(selected.stage) ? "On hold during the final inspection"
              : proposal.status === "sent" ? "Waiting for customer" : "No longer open"}</span>
            <strong>{proposal.title}</strong>
            <p>{proposal.detail}</p>
            {proposal.customerReply && <p>Customer reply: &quot;{proposal.customerReply}&quot;</p>}
          </article>)}
        </section>}

        <div className={styles.lowerGrid}>
          <section className={styles.filesPanel}><header><span>PROJECT EVIDENCE</span><strong>{selected.files.length} files</strong></header><div>{selected.files.length ? selected.files.map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}><span>{file.mimeType.startsWith("image/") ? "PHOTO" : "FILE"}</span><strong>{file.fileName}</strong><small>{file.category.replace("_", " ")} · {file.visibility}</small></a>) : <p>No photos uploaded yet.</p>}</div></section>
          <section className={styles.activityPanel}><header><span>{role === "owner" ? "OWNER ACTIVITY FEED" : "PROJECT ACTIVITY"}</span><strong>{role === "owner" ? "Everything recorded" : "What your role can see"}</strong></header><ol>{selectedEvents.map((item) => <li key={item.id}><i /><div><strong>{item.title}</strong><p>{item.detail}</p><small>{item.actorRole} · {when(item.createdAt)}</small></div></li>)}</ol></section>
        </div>
      </div> : <div className={styles.empty}><strong>No project workflow is assigned to this role.</strong><span>Admin can assign a Site Visit after the project folder is created.</span></div>}
    </div>
  </section>;
}

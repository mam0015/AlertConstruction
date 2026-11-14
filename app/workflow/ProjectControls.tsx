"use client";

// Owner/Admin controls beside the step-by-step workflow: open a project for a customer who did not use the website form, set the project
// stage (ready-made or typed), decide what the customer sees (a confirmed status and dated notes), and hand the customer their private link.
import { FormEvent, useRef, useState } from "react";
import { newClientKey } from "./client-key";
import type { WorkflowCase, WorkflowSnapshot } from "./types";
import styles from "./workflow.module.css";

// The same service names as the Owner/Admin portfolio editor, so a project opened here shows its service correctly there. Others can be typed.
const standardServices = ["Home Renovation", "Bathroom Renovation", "Kitchen Renovation", "Home Extension", "New Home", "Building Inspection", "Maintenance & Repairs", "Engineering"];
const melbourneToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

function shortDate(value: string) {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

// The customer's private link. Anyone holding it can open the project, so it is only shown to Owner and Admin, who give it to the customer.
export function customerLink(requestCode: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/track/${requestCode}`;
}

export function CopyCustomerLink({ requestCode }: { requestCode: string }) {
  const [copied, setCopied] = useState("");
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
    } catch {
      setCopied("Select the text and copy it");
    }
    window.setTimeout(() => setCopied(""), 2500);
  }
  return <div className={styles.reviewBox} aria-label="Customer access">
    <div>
      <strong>Customer access code</strong>
      <p style={{ fontFamily: "ui-monospace, monospace", overflowWrap: "anywhere", userSelect: "all" }}>{requestCode}</p>
      <small>Give this code (or the link) only to the customer: it opens their project page, messages and files without a password.</small>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" className={styles.toolButton} onClick={() => void copy(customerLink(requestCode), "Link")}>Copy customer link</button>
      <button type="button" className={`${styles.toolButton} ${styles.toolButtonQuiet}`} onClick={() => void copy(requestCode, "Code")}>Copy code</button>
      {copied && <span role="status">{copied}</span>}
    </div>
  </div>;
}

type Created = { caseId: number; requestCode: string; projectCode: string; repeated?: boolean };

export function NewProjectPanel({ stageOptions, onCreated, onCancel, onSubmitting }: { stageOptions: string[]; onCreated: (created: Created, snapshot: WorkflowSnapshot | null) => void; onCancel: () => void; onSubmitting?: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", location: "", description: "", entry: "underway", statusLabel: "" });
  // The same key is sent again if the first answer was lost, so pressing Create twice can never make two projects.
  const [clientKey, setClientKey] = useState(newClientKey);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  // Changing anything makes it a different project request with a new key (a retry of the same details keeps the key).
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => { setForm((current) => ({ ...current, [key]: event.target.value })); setClientKey(newClientKey()); };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true); setError("");
    onSubmitting?.();
    try {
      const response = await fetch("/api/workflow/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, clientKey }) });
      const result = await response.json().catch(() => ({})) as { data?: { created: Created; snapshot: WorkflowSnapshot | null }; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The project could not be created.");
      onCreated(result.data.created, result.data.snapshot);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The project could not be created.");
    } finally {
      setWorking(false);
    }
  }

  return <section className={styles.actionPanel} aria-label="New project for a customer">
    <header><div><span>NEW PROJECT · OWNER &amp; ADMIN</span><h3>Open a project for a customer who contacted you directly</h3></div></header>
    <p className={styles.waiting}>For jobs that did not come through the website form. The customer gets their own private link to follow the project and message you.</p>
    <form onSubmit={(event) => void submit(event)}>
      <div className={styles.twoFields}>
        <label><span>Customer name *</span><input value={form.name} onChange={set("name")} maxLength={120} required autoComplete="off" /></label>
        <label><span>Type of work *</span><input value={form.service} onChange={set("service")} maxLength={120} list="atp-service-options" placeholder="Choose or type, e.g. Bathroom Renovation" required /></label>
        <datalist id="atp-service-options">{standardServices.map((service) => <option key={service} value={service} />)}</datalist>
      </div>
      <div className={styles.twoFields}>
        <label><span>Customer email (optional)</span><input type="email" value={form.email} onChange={set("email")} maxLength={254} autoComplete="off" /></label>
        <label><span>Customer phone (optional)</span><input type="tel" value={form.phone} onChange={set("phone")} maxLength={40} autoComplete="off" /></label>
      </div>
      <label><span>Project address or suburb *</span><input value={form.location} onChange={set("location")} maxLength={240} required /></label>
      <label><span>Project details (internal)</span><textarea value={form.description} onChange={set("description")} maxLength={6000} placeholder="What was agreed, access, anything the team should know…" /></label>
      <div className={styles.twoFields}>
        <label><span>Where does the project start? *</span><select value={form.entry} onChange={set("entry")}>
          <option value="underway">Work already underway</option>
          <option value="site_visit">Ready for a site visit</option>
          <option value="new">New enquiry — start with Admin review</option>
        </select></label>
        <label><span>Stage (choose or type your own)</span><input list="atp-stage-options" value={form.statusLabel} onChange={set("statusLabel")} maxLength={80} placeholder="e.g. Waiting for planner" /></label>
      </div>
      <StageOptionsList options={stageOptions} />
      {error && <p className={styles.waiting} role="alert" style={{ color: "#b42318" }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button disabled={working}>{working ? "Creating…" : "Create project & get the customer link"}</button>
        <button type="button" className={styles.dangerButton} onClick={onCancel} disabled={working}>Cancel</button>
      </div>
    </form>
  </section>;
}

function StageOptionsList({ options }: { options: string[] }) {
  return <datalist id="atp-stage-options">{options.map((option) => <option value={option} key={option} />)}</datalist>;
}

type Act = (name: string, payload?: Record<string, unknown>, success?: string) => Promise<boolean>;

export function StageAndCustomerPanel({ selected, stageOptions, act, working }: { selected: WorkflowCase; stageOptions: string[]; act: Act; working: boolean }) {
  const view = selected.view;
  const [stage, setStage] = useState(view?.statusLabel ?? "");
  const [statusTitle, setStatusTitle] = useState(view?.draft?.title ?? view?.customerStatus?.title ?? "");
  const [statusDetail, setStatusDetail] = useState(view?.draft?.detail ?? view?.customerStatus?.detail ?? "");
  // The stage and the draft each form was opened on. Saving names them, so a stage or draft someone else saved meanwhile is never replaced
  // unseen. While nobody is typing in a form, it follows the latest saved value by itself; once someone types, a newer value from
  // elsewhere is shown as a warning and their text is kept until they choose to replace it.
  const currentLabel = view?.statusLabel ?? "";
  const currentDraft = { title: view?.draft?.title ?? "", detail: view?.draft?.detail ?? "" };
  const [openedLabel, setOpenedLabel] = useState(currentLabel);
  const [stageTyped, setStageTyped] = useState(false);
  const [openedDraft, setOpenedDraft] = useState(currentDraft);
  const [draftTyped, setDraftTyped] = useState(false);
  // What is being saved right now (its own result is not "someone else's change"), and a count of edits, so text typed while a save is
  // on its way is never replaced when that save comes back.
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState<{ title: string; detail: string } | null>(null);
  const stageEdits = useRef(0);
  const draftEdits = useRef(0);
  if (currentLabel !== openedLabel && currentLabel !== savingLabel && (!stageTyped || currentLabel === stage.trim())) { setOpenedLabel(currentLabel); setStage(currentLabel); setStageTyped(false); }
  const draftMoved = currentDraft.title !== openedDraft.title || currentDraft.detail !== openedDraft.detail;
  const draftIsSaving = savingDraft !== null && currentDraft.title === savingDraft.title && currentDraft.detail === savingDraft.detail;
  if (draftMoved && !draftIsSaving && (!draftTyped || (currentDraft.title === statusTitle.trim() && currentDraft.detail === statusDetail.trim()))) {
    setOpenedDraft(currentDraft); setDraftTyped(false);
    if (view?.draft) { setStatusTitle(currentDraft.title); setStatusDetail(currentDraft.detail); }
  }
  const stageConflict = currentLabel !== openedLabel && currentLabel !== savingLabel;
  const draftConflict = draftMoved && !draftIsSaving;
  async function saveStage() {
    const sent = stage.trim(), edits = stageEdits.current;
    setSavingLabel(sent);
    const ok = await act("set_status_label", { label: stage, openedLabel }, "Project stage saved.");
    // Saved: this form now works on the stage it saved. Text typed while it was saving stays (and stays "typed").
    if (ok) { setOpenedLabel(sent); if (stageEdits.current === edits) setStageTyped(false); }
    setSavingLabel(null);
  }
  async function saveDraft() {
    const sent = { title: statusTitle.trim(), detail: statusDetail.trim() }, edits = draftEdits.current;
    setSavingDraft(sent);
    const ok = await act("save_customer_status", { title: statusTitle, detail: statusDetail, openedTitle: openedDraft.title, openedDetail: openedDraft.detail }, "Status saved as a draft. The customer does not see it yet.");
    if (ok) { setOpenedDraft(sent); if (draftEdits.current === edits) setDraftTyped(false); }
    setSavingDraft(null);
  }
  const [note, setNote] = useState({ body: "", showFrom: "", showUntil: "" });
  const [noteKey, setNoteKey] = useState(newClientKey);
  // Changing the note makes it a new note with a new key (a key always belongs to exactly one note).
  const changeNote = (patch: Partial<typeof note>) => { setNote((current) => ({ ...current, ...patch })); setNoteKey(newClientKey()); };
  const today = melbourneToday();
  const draftDiffers = Boolean(view?.draft) && (view?.draft?.title !== view?.customerStatus?.title || view?.draft?.detail !== view?.customerStatus?.detail);
  const notes = view?.notes ?? [];
  const noteState = (item: (typeof notes)[number]) => item.removedAt ? "Removed" : item.showFrom && item.showFrom > today ? "Scheduled" : item.showUntil && item.showUntil < today ? "Ended" : "Showing to the customer";

  return <section className={styles.actionPanel} aria-label="Stage and what the customer sees">
    <header><div><span>STAGE &amp; WHAT THE CUSTOMER SEES · OWNER &amp; ADMIN</span><h3>Decide the stage and what the customer is shown</h3></div><b>{view?.statusLabel || "No stage set"}</b></header>

    <form onSubmit={(event) => { event.preventDefault(); void saveStage(); }}>
      {stageConflict && <div role="alert" className={styles.waiting} style={{ border: "1px solid rgba(255,120,90,.6)" }}>Someone else changed the stage to &ldquo;{currentLabel || "no stage"}&rdquo; after you opened this page. Your text is kept; saving is refused unless you choose to replace it. <button type="button" onClick={() => setOpenedLabel(currentLabel)}>Replace it with my stage</button></div>}
      <label><span>Project stage (choose from the list or type your own — for example &ldquo;Delayed — rain&rdquo;)</span><input list="atp-stage-options" value={stage} onChange={(event) => { setStage(event.target.value); setStageTyped(true); stageEdits.current += 1; }} maxLength={80} required /></label>
      <StageOptionsList options={stageOptions} />
      <small className={styles.waiting}>The stage is for your team and the project list. The customer only sees the status below, once you show it.</small>
      <button disabled={working || !stage.trim() || stage.trim() === view?.statusLabel}>Save stage</button>
    </form>

    <div className={styles.reviewBox}>
      <div>
        <strong>The customer currently sees:</strong>
        {view?.customerStatus ? <><p><b>{view.customerStatus.title}</b></p>{view.customerStatus.detail && <p style={{ whiteSpace: "pre-wrap" }}>{view.customerStatus.detail}</p>}<small>Shown since {shortDate(view.customerStatus.shownAt)}</small></> : <p>No status is shown to the customer.</p>}
      </div>
      {view?.customerStatus && <div><button className={styles.dangerButton} disabled={working} onClick={() => { if (window.confirm("Stop showing this status to the customer?")) void act("hide_customer_status", {}, "The customer no longer sees a status."); }}>Stop showing</button></div>}
    </div>
    <form onSubmit={(event) => { event.preventDefault(); void saveDraft(); }}>
      {draftConflict && <div role="alert" className={styles.waiting} style={{ border: "1px solid rgba(255,120,90,.6)" }}>Someone else saved a different draft (&ldquo;{currentDraft.title || "empty"}&rdquo;) after you opened this page. Your text is kept; saving is refused unless you choose to replace it. <button type="button" onClick={() => setOpenedDraft(currentDraft)}>Replace it with my text</button></div>}
      <label><span>Status for the customer (short)</span><input value={statusTitle} onChange={(event) => { setStatusTitle(event.target.value); setDraftTyped(true); draftEdits.current += 1; }} maxLength={120} placeholder="e.g. Planner visiting Thursday" required /></label>
      <label><span>More detail for the customer (optional)</span><textarea value={statusDetail} onChange={(event) => { setStatusDetail(event.target.value); setDraftTyped(true); draftEdits.current += 1; }} maxLength={1000} placeholder="e.g. The planner will check the drawings on site. No action needed from you." /></label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button disabled={working || !statusTitle.trim()}>Save draft</button>
        {view?.draft && <button type="button" disabled={working || !draftDiffers} onClick={() => { if (window.confirm(`Show this to the customer now?\n\n${view.draft?.title}${view.draft?.detail ? `\n${view.draft.detail}` : ""}`)) void act("show_customer_status", { title: view.draft?.title ?? "", detail: view.draft?.detail ?? "" }, "The customer now sees this status."); }}>Show to customer</button>}
        {view?.draft && <small>{draftDiffers ? `Draft saved ${shortDate(view.draft.updatedAt)} — not shown yet` : "The draft is what the customer sees"}</small>}
      </div>
    </form>

    <form onSubmit={(event) => {
      event.preventDefault();
      const sent = note;
      void act("add_customer_note", { ...sent, clientKey: noteKey }, "Note added for the customer.").then((ok) => {
        if (!ok) return;
        setNoteKey(newClientKey());
        // Only the note that was saved is cleared; anything typed meanwhile stays.
        setNote((current) => current.body === sent.body && current.showFrom === sent.showFrom && current.showUntil === sent.showUntil ? { body: "", showFrom: "", showUntil: "" } : current);
      });
    }}>
      <label><span>Note for the customer</span><textarea value={note.body} onChange={(event) => changeNote({ body: event.target.value })} maxLength={1000} placeholder="e.g. Please keep the driveway clear on Monday for the delivery." required /></label>
      <div className={styles.twoFields}>
        <label><span>Show from (optional)</span><input type="date" value={note.showFrom} onChange={(event) => changeNote({ showFrom: event.target.value })} /></label>
        <label><span>Show until (optional)</span><input type="date" value={note.showUntil} min={note.showFrom || today} onChange={(event) => changeNote({ showUntil: event.target.value })} /></label>
      </div>
      <small className={styles.waiting}>Leave the dates empty to show the note until you remove it. After the end date the customer no longer sees it.</small>
      <button disabled={working || !note.body.trim()}>Add note for the customer</button>
    </form>
    {notes.length > 0 && <div>{notes.map((item) => <article className={styles.updateApproval} key={item.id}>
      <span>{noteState(item)}{item.showFrom || item.showUntil ? ` · ${item.showFrom ? shortDate(item.showFrom) : "now"} → ${item.showUntil ? shortDate(item.showUntil) : "no end date"}` : ""}</span>
      <p style={{ whiteSpace: "pre-wrap", textDecoration: item.removedAt ? "line-through" : undefined }}>{item.body}</p>
      {!item.removedAt && <div><button className={styles.dangerButton} disabled={working} onClick={() => { if (window.confirm("Remove this note? The customer will no longer see it. It stays in your history.")) void act("remove_customer_note", { noteId: item.id }, "Note removed."); }}>Remove</button></div>}
    </article>)}</div>}
  </section>;
}

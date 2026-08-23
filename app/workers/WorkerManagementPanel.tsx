"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { WorkerManagementSnapshot } from "./types";
import styles from "./workers.module.css";

const empty: WorkerManagementSnapshot = { projects: [], workers: [], assignments: [], tasks: [], files: [], reports: [] };
type Tab = "assignments" | "tasks" | "files" | "reports";

function date(value: string) {
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00+10:00` : value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

export default function WorkerManagementPanel({ role }: { role: "owner" | "admin" }) {
  const [data, setData] = useState(empty);
  const [tab, setTab] = useState<Tab>("assignments");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [caseId, setCaseId] = useState(0);
  const [workerEmail, setWorkerEmail] = useState("");
  const [tradeTitle, setTradeTitle] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileWorkers, setFileWorkers] = useState<string[]>([]);
  const [reportNotes, setReportNotes] = useState<Record<number, string>>({});

  const query = `?previewRole=${role}`;
  useEffect(() => {
    let active = true;
    void fetch(`/api/worker/manage?previewRole=${role}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { data?: WorkerManagementSnapshot; error?: string } }))
      .then(({ response, result }) => {
        if (!response.ok || !result.data) throw new Error(result.error ?? "Worker management could not be loaded.");
        if (!active) return;
        setData(result.data);
        setCaseId(result.data.projects[0]?.caseId ?? 0);
        setWorkerEmail(result.data.workers[0]?.email ?? "");
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Worker management could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role]);

  const selectedWorker = data.workers.find((worker) => worker.email === workerEmail);
  const selectedProject = data.projects.find((project) => project.caseId === caseId);
  const assignedEmails = useMemo(() => data.assignments.filter((assignment) => assignment.caseId === caseId && assignment.status === "active").map((assignment) => assignment.workerEmail), [data.assignments, caseId]);

  async function action(name: string, payload: Record<string, unknown>, success: string) {
    setWorking(true); setError("");
    try {
      const response = await fetch(`/api/worker/manage${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, payload }) });
      const result = await response.json() as { data?: WorkerManagementSnapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The change could not be saved.");
      setData(result.data); setNotice(success); window.setTimeout(() => setNotice(""), 4000); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The change could not be saved."); return false; }
    finally { setWorking(false); }
  }

  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action("assign_worker", { caseId, workerEmail, tradeTitle: tradeTitle || selectedWorker?.tradeTitle }, `${workerEmail} can now open ${selectedProject?.projectCode}.`);
  }
  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action("create_task", { caseId, workerEmail, title, instructions }, `Task sent to ${workerEmail}.`)) { setTitle(""); setInstructions(""); }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError("Choose a plan, drawing or project file."); return; }
    setWorking(true); setError("");
    try {
      const form = new FormData(); form.set("caseId", String(caseId)); form.set("workerEmails", JSON.stringify(fileWorkers)); form.set("file", file);
      const response = await fetch(`/api/worker/files${query}`, { method: "POST", body: form });
      const result = await response.json() as { data?: WorkerManagementSnapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The file could not be uploaded.");
      setData(result.data); setFile(null); setNotice(fileWorkers.length ? `File uploaded and shared with ${fileWorkers.length} selected Worker account(s).` : "File uploaded privately. No Worker can open it until access is ticked."); window.setTimeout(() => setNotice(""), 4000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The file could not be uploaded."); }
    finally { setWorking(false); }
  }

  return <section className={styles.shell}>
    <header className={styles.header}><div><span>WORKER ACCESS CONTROL</span><h2>Tasks, files and daily reports</h2><p>Assign only the work and documents each trade needs. Worker accounts never receive customer history, pricing or management records.</p></div><b>{data.workers.length} approved Workers</b></header>
    {(notice || error) && <div className={`${styles.notice} ${error ? styles.error : ""}`}><strong>{error ? "Action stopped" : "Saved"}</strong><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}
    <nav className={styles.tabs}>{(["assignments", "tasks", "files", "reports"] as Tab[]).map((item) => <button className={tab === item ? styles.active : ""} key={item} onClick={() => setTab(item)}>{item === "assignments" ? "Worker access" : item === "tasks" ? "Assigned tasks" : item === "files" ? "Shared files" : "End-of-day reports"}<b>{item === "assignments" ? data.assignments.filter((assignment) => assignment.status === "active").length : item === "tasks" ? data.tasks.length : item === "files" ? data.files.length : data.reports.length}</b></button>)}</nav>

    {loading ? <div className={styles.loading}><i />Opening Worker controls…</div> : <>
      {tab === "assignments" && <div className={styles.twoColumns}><form className={styles.formCard} onSubmit={assign}><header><span>01 · PROJECT ACCESS</span><h3>Assign a Worker</h3></header><label><span>Active project</span><select value={caseId} onChange={(event) => { setCaseId(Number(event.target.value)); setFileWorkers([]); }} required><option value="">Choose project</option>{data.projects.map((project) => <option value={project.caseId} key={project.caseId}>{project.projectCode} · {project.siteLabel}</option>)}</select></label><label><span>Approved Worker</span><select value={workerEmail} onChange={(event) => { setWorkerEmail(event.target.value); const worker = data.workers.find((item) => item.email === event.target.value); setTradeTitle(worker?.tradeTitle ?? ""); }} required><option value="">Choose Worker</option>{data.workers.map((worker) => <option value={worker.email} key={worker.email}>{worker.tradeTitle} · {worker.email}</option>)}</select></label><label><span>Trade shown in this project</span><input value={tradeTitle} onChange={(event) => setTradeTitle(event.target.value)} placeholder={selectedWorker?.tradeTitle || "Electrician, Plumber, Carpenter…"} /></label><button disabled={working || !data.projects.length || !data.workers.length}>{working ? "Saving…" : "Assign project access"}</button></form>
      <section className={styles.listCard}><header><span>ACTIVE ASSIGNMENTS</span><h3>Who can see each project</h3></header>{data.assignments.filter((assignment) => assignment.status === "active").map((assignment) => <article key={assignment.id}><div><strong>{assignment.tradeTitle}</strong><span>{assignment.workerEmail}</span><small>{assignment.projectCode} · assigned {date(assignment.assignedAt)}</small></div><button disabled={working} onClick={() => void action("unassign_worker", { caseId: assignment.caseId, workerEmail: assignment.workerEmail }, `Access removed for ${assignment.workerEmail}.`)}>Remove access</button></article>)}{!data.assignments.some((assignment) => assignment.status === "active") && <p className={styles.empty}>No Worker has been assigned to an active project.</p>}</section></div>}

      {tab === "tasks" && <div className={styles.twoColumns}><form className={styles.formCard} onSubmit={createTask}><header><span>02 · WORK INSTRUCTIONS</span><h3>Create a Worker task</h3></header><label><span>Project</span><select value={caseId} onChange={(event) => setCaseId(Number(event.target.value))} required>{data.projects.map((project) => <option value={project.caseId} key={project.caseId}>{project.projectCode} · {project.siteLabel}</option>)}</select></label><label><span>Assigned Worker</span><select value={workerEmail} onChange={(event) => setWorkerEmail(event.target.value)} required><option value="">Choose an assigned Worker</option>{data.workers.filter((worker) => assignedEmails.includes(worker.email)).map((worker) => <option value={worker.email} key={worker.email}>{worker.tradeTitle} · {worker.email}</option>)}</select></label><label><span>Task</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Complete electrical rough-in" required /></label><label><span>Exact instructions</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Tell the Worker only what must be completed. No budget or customer discussion…" required /></label><p className={styles.formNote}>Tasks intentionally have no future date. The Worker reports the next required step at End of Day.</p><button disabled={working}>Send task to Worker</button></form>
      <section className={styles.listCard}><header><span>LIVE TASK LIST</span><h3>Management-controlled status</h3></header>{data.tasks.map((task) => <article className={styles.taskRow} key={task.id}><div><strong>{task.title}</strong><span>{task.workerEmail}</span><small>{task.projectCode} · {task.status.replaceAll("_", " ")}</small><p>{task.instructions}</p></div><div><select value={task.status} onChange={(event) => void action("set_task_status", { taskId: task.id, status: event.target.value }, `Task marked ${event.target.value.replaceAll("_", " ")}.`)}><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select><button onClick={() => void action("delete_task", { taskId: task.id }, "Task removed.")}>Delete</button></div></article>)}{!data.tasks.length && <p className={styles.empty}>No Worker tasks have been created.</p>}</section></div>}

      {tab === "files" && <div className={styles.twoColumns}><form className={styles.formCard} onSubmit={upload}><header><span>03 · EXPLICIT FILE ACCESS</span><h3>Upload and choose recipients</h3></header><label><span>Project</span><select value={caseId} onChange={(event) => { setCaseId(Number(event.target.value)); setFileWorkers([]); }} required>{data.projects.map((project) => <option value={project.caseId} key={project.caseId}>{project.projectCode} · {project.siteLabel}</option>)}</select></label><label><span>Plan, drawing or project file</span><input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label><fieldset><legend>Workers allowed to open this file · optional</legend>{data.workers.filter((worker) => assignedEmails.includes(worker.email)).map((worker) => <label className={styles.checkbox} key={worker.email}><input type="checkbox" checked={fileWorkers.includes(worker.email)} onChange={() => setFileWorkers((current) => current.includes(worker.email) ? current.filter((email) => email !== worker.email) : [...current, worker.email])} /><span><strong>{worker.tradeTitle}</strong><small>{worker.email}</small></span></label>)}</fieldset><p className={styles.formNote}>Leave everyone unticked to store the file privately. You can grant exact access later.</p><button disabled={working}>{working ? "Uploading…" : fileWorkers.length ? `Upload for ${fileWorkers.length} selected` : "Upload privately"}</button></form>
      <section className={styles.listCard}><header><span>PROJECT FILE PERMISSIONS</span><h3>Unticked Workers see nothing</h3></header>{data.files.map((item) => <article className={styles.fileRow} key={item.id}><div><strong>{item.fileName}</strong><span>{item.projectCode}</span><small>{item.sharedWith.length} Worker account(s) can open this file</small></div><div className={styles.accessList}>{data.workers.filter((worker) => data.assignments.some((assignment) => assignment.caseId === item.caseId && assignment.workerEmail === worker.email && assignment.status === "active")).map((worker) => <label key={worker.email}><input type="checkbox" checked={item.sharedWith.includes(worker.email)} onChange={(event) => void action("set_file_access", { fileId: item.id, workerEmail: worker.email, granted: event.target.checked }, event.target.checked ? `File shared with ${worker.email}.` : `File hidden from ${worker.email}.`)} /><span>{worker.tradeTitle}<small>{worker.email}</small></span></label>)}</div></article>)}{!data.files.length && <p className={styles.empty}>No Worker file has been uploaded.</p>}</section></div>}

      {tab === "reports" && <section className={styles.reportList}><header><div><span>OWNER & ADMIN VISIBILITY</span><h3>Worker End-of-Day reports</h3></div><b>{data.reports.filter((report) => report.status === "submitted").length} awaiting review</b></header>{data.reports.map((report) => <article key={report.id}><div className={styles.reportHead}><span><strong>{report.workerEmail}</strong><small>{report.projectCode} · {date(report.workDate)}</small></span><b>{report.status}</b></div><div className={styles.reportGrid}><div><small>COMPLETED WORK</small><p>{report.completedWork}</p></div><div><small>NEXT STEP</small><p>{report.nextStep}</p></div><div><small>ISSUE OR DELAY</small><p>{report.issuesDelays || "None reported"}</p></div></div>{report.status === "submitted" ? <div className={styles.review}><input value={reportNotes[report.id] ?? ""} onChange={(event) => setReportNotes((current) => ({ ...current, [report.id]: event.target.value }))} placeholder="Optional management review note" /><button onClick={() => void action("review_report", { reportId: report.id, note: reportNotes[report.id] ?? "" }, "Worker report reviewed and recorded.")}>Mark reviewed</button></div> : <p className={styles.reviewed}>Reviewed by {report.reviewedBy}{report.reviewNote ? ` · ${report.reviewNote}` : ""}</p>}</article>)}{!data.reports.length && <p className={styles.empty}>Worker reports will appear here after submission.</p>}</section>}
    </>}
  </section>;
}

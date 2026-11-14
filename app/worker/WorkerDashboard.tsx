"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "../BrandLogo";
import type { WorkerSnapshot } from "../workers/types";
import TaskInbox from "../tasks/TaskInbox";
import styles from "./worker.module.css";

type View = "work" | "projects" | "report";
const empty: WorkerSnapshot = { identity: { email: "", role: "Worker", tradeTitle: "Worker" }, projects: [], tasks: [], files: [], reports: [], missingReportDates: [], today: "" };

function readableDate(value: string) {
  const date = new Date(`${value}T12:00:00+10:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function WorkerDashboard({ preview = false }: { preview?: boolean }) {
  const [view, setView] = useState<View>("work");
  const [data, setData] = useState<WorkerSnapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState(0);
  // One draft per project and day: its typed text and the version of that day's report it was opened on ("" = none yet). Switching
  // project and back brings back the same draft with the same version, so a report sent meanwhile from another screen is never replaced
  // without the explicit choice below.
  const [drafts, setDrafts] = useState<Record<string, { completedWork: string; nextStep: string; issuesDelays: string; opened: string }>>({});
  // The latest drafts, for the answer of a send that was started earlier (it must not judge by the drafts of the moment it started).
  const draftsRef = useRef(drafts);
  useEffect(() => { draftsRef.current = drafts; }, [drafts]);

  useEffect(() => {
    let active = true;
    void fetch(`/api/worker${preview ? "?previewWorker=1" : ""}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { data?: WorkerSnapshot; error?: string } }))
      .then(({ response, result }) => {
        if (!response.ok || !result.data) throw new Error(result.error ?? "Your work could not be loaded.");
        if (!active) return;
        setData(result.data);
        setProjectId(result.data.projects[0]?.caseId ?? 0);
        if (result.data.missingReportDates.length) setView("report");
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Your work could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [preview]);

  const missingDate = data.missingReportDates[0] ?? "";
  const reportDate = missingDate || data.today;
  const locked = Boolean(missingDate);
  const selectedProject = data.projects.find((project) => project.caseId === projectId) ?? data.projects[0];
  const openTasks = useMemo(() => data.tasks.filter((task) => task.status !== "completed"), [data.tasks]);
  // The report of this day the draft was opened on. Sending names it, so a report sent meanwhile from another screen (a newer issue, one
  // the Owner already reviewed) is never overwritten by this draft; it moves on only with this draft's own send (the version the server
  // hands back) or the explicit "Replace it with my report".
  const reportKey = `${selectedProject?.caseId ?? 0}|${reportDate}`;
  const currentReport = data.reports.find((report) => report.caseId === selectedProject?.caseId && report.workDate === reportDate);
  const currentVersion = currentReport?.revision ?? "";
  if (!loading && selectedProject && !drafts[reportKey]) setDrafts((all) => all[reportKey] ? all : { ...all, [reportKey]: { completedWork: "", nextStep: "", issuesDelays: "", opened: currentVersion } });
  const draft = drafts[reportKey] ?? { completedWork: "", nextStep: "", issuesDelays: "", opened: currentVersion };
  const { completedWork, nextStep, issuesDelays } = draft;
  const updateDraft = (patch: Partial<typeof draft>) => setDrafts((all) => ({ ...all, [reportKey]: { ...(all[reportKey] ?? draft), ...patch } }));
  const setCompletedWork = (value: string) => updateDraft({ completedWork: value });
  const setNextStep = (value: string) => updateDraft({ nextStep: value });
  const setIssuesDelays = (value: string) => updateDraft({ issuesDelays: value });
  const reportConflict = draft.opened !== currentVersion;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    if (!selectedProject) { setError("No assigned project is available for this report."); return; }
    setWorking(true); setError("");
    // What is sent (and for which project and day): after the answer only this is cleared; anything typed meanwhile stays.
    const sentKey = reportKey;
    const sent = { completedWork, nextStep, issuesDelays };
    try {
      const response = await fetch(`/api/worker${preview ? "?previewWorker=1" : ""}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit_report", payload: { caseId: selectedProject.caseId, workDate: reportDate, ...sent, replacing: draft.opened } }) });
      const result = await response.json() as { data?: WorkerSnapshot; error?: string; revision?: string };
      // Refused because a report for this day was sent from another screen: it is loaded and shown, and the typed text is kept.
      if (response.status === 409) void fetch(`/api/worker${preview ? "?previewWorker=1" : ""}`, { cache: "no-store" }).then((fresh) => fresh.json()).then((fresh: { data?: WorkerSnapshot }) => { if (fresh.data) setData(fresh.data); }).catch(() => undefined);
      if (!response.ok || !result.data) throw new Error(result.error ?? "The report could not be submitted.");
      const revision = typeof result.revision === "string" ? result.revision : "";
      const latest = draftsRef.current[sentKey];
      const untouched = !latest || (latest.completedWork === sent.completedWork && latest.nextStep === sent.nextStep && latest.issuesDelays === sent.issuesDelays);
      // The draft now works on the report just sent (its version), keeping any text typed while it was sending.
      setDrafts((all) => {
        const current = all[sentKey];
        const same = !current || (current.completedWork === sent.completedWork && current.nextStep === sent.nextStep && current.issuesDelays === sent.issuesDelays);
        return { ...all, [sentKey]: same ? { completedWork: "", nextStep: "", issuesDelays: "", opened: revision } : { ...current, opened: revision } };
      });
      setData(result.data); setNotice(untouched ? `Report for ${readableDate(reportDate)} submitted to Owner and Admin.` : `Report for ${readableDate(reportDate)} submitted. What you typed while it was sending is still below — send again to add it.`);
      window.setTimeout(() => setNotice(""), 4500);
      if (untouched && !result.data.missingReportDates.length) setView("work");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The report could not be submitted."); }
    finally { setWorking(false); }
  }

  function choose(next: View) {
    if (locked && next !== "report") { setError(`Complete the missing report for ${readableDate(missingDate)} first.`); return; }
    setView(next); setError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/"><BrandLogo kind="tradie" tone="dark" className={styles.logo} /></Link>
      <div className={styles.identity}><span>{data.identity.tradeTitle.slice(0, 2).toUpperCase()}</span><div><small>APPROVED WORKER</small><strong>{data.identity.tradeTitle}</strong><b>{data.identity.email || "Secure team account"}</b></div></div>
      <nav>
        <button className={view === "work" ? styles.active : ""} onClick={() => choose("work")}><i>✓</i><span>My work</span><b>{openTasks.length}</b></button>
        <button className={view === "projects" ? styles.active : ""} onClick={() => choose("projects")}><i>▦</i><span>Projects & files</span></button>
        <button className={view === "report" ? styles.active : ""} onClick={() => choose("report")}><i>＋</i><span>End of day</span>{locked && <b className={styles.alertCount}>!</b>}</button>
      </nav>
      <div className={styles.restricted}><span>PRIVATE BY DESIGN</span><strong>Tasks and shared files only</strong><small>Customer history, budgets, quotes, margins and management notes are not available to this account.</small></div>
      <div className={styles.foot}><span><i /> Secure role session</span><Link href="/">Public website ↗</Link></div>
    </aside>

    <section className={styles.main}>
      <header className={styles.topbar}><div><span>Alert Tradie Pro</span><strong>Worker workspace</strong></div><div className={styles.profile}><b>{data.identity.tradeTitle.slice(0, 2).toUpperCase()}</b><span>{data.identity.tradeTitle}<small>{data.identity.email}</small></span></div></header>
      <div className={styles.content}>
        <section className={styles.heading}><div><p>{view === "work" ? "YOUR ASSIGNED WORK" : view === "projects" ? "CONTROLLED PROJECT ACCESS" : "END-OF-DAY REPORTING"}</p><h1>{view === "work" ? "What you need to do." : view === "projects" ? "Projects and files." : missingDate ? "Yesterday’s report is required." : "Tell the team what happened."}</h1><span>{view === "work" ? "Only instructions assigned to your account are shown." : view === "projects" ? "A file appears only when Owner or Admin shares it with you." : "Record completed work and your next step. No future date is required."}</span></div>{view !== "report" && <button onClick={() => choose("report")}>＋ End-of-day report</button>}</section>

        {(notice || error) && <div className={`${styles.notice} ${error ? styles.error : ""}`}><b>{error ? "!" : "✓"}</b><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}
        {locked && <section className={styles.missing}><div><span>MISSING REPORT</span><strong>{readableDate(missingDate)}</strong><p>Your previous work session has no End-of-Day report. Complete it now before opening today&apos;s tasks or files.</p></div><button onClick={() => setView("report")}>Complete report →</button></section>}

        {loading ? <div className={styles.loading}><i />Opening assigned work…</div> : <>
          {view === "work" && !locked && <>
            <section className={styles.metrics}><article><span>ASSIGNED PROJECTS</span><strong>{data.projects.length}</strong><small>Active work access</small></article><article><span>OPEN TASKS</span><strong>{openTasks.length}</strong><small>Set by Owner or Admin</small></article><article><span>SHARED FILES</span><strong>{data.files.length}</strong><small>Permission-controlled</small></article></section>
            <TaskInbox role="Worker" preview={preview} compact emptyText={data.tasks.length ? { title: "No other directions.", detail: "Your project tasks are listed under each project below." } : undefined} />
            <section className={styles.taskGrid}>{data.projects.map((project) => <article className={styles.projectTasks} key={project.caseId}><header><div><span>{project.projectCode}</span><h2>{project.siteLabel || "Assigned worksite"}</h2></div><b>{project.tradeTitle}</b></header><div>{data.tasks.filter((task) => task.caseId === project.caseId).map((task, index) => <section className={task.status === "completed" ? styles.doneTask : ""} key={task.id}><i>{task.status === "completed" ? "✓" : index + 1}</i><div><strong>{task.title}</strong><p>{task.instructions}</p><small>{task.status === "completed" ? "Completed by management record" : task.status === "in_progress" ? "In progress" : "Assigned"}</small></div></section>)}{!data.tasks.some((task) => task.caseId === project.caseId) && <p className={styles.empty}>No task has been assigned to you for this project.</p>}</div></article>)}</section>
            {!data.projects.length && <section className={styles.emptyState}><strong>No active work assigned.</strong><span>Owner or Admin must assign your account to an active project before anything appears here.</span></section>}
          </>}

          {view === "projects" && !locked && <section className={styles.projectGrid}>{data.projects.map((project) => <article key={project.caseId}><header><span>{project.projectCode}</span><b>{project.tradeTitle}</b></header><h2>{project.siteLabel || "Assigned worksite"}</h2><p>Only instructions and explicitly shared project files are available.</p><div className={styles.fileList}>{data.files.filter((file) => file.caseId === project.caseId).map((file) => <a href={`${file.url}${preview ? "&previewWorker=1" : ""}`} target="_blank" rel="noreferrer" key={file.id}><i>{file.mimeType.includes("pdf") ? "PDF" : file.mimeType.startsWith("image/") ? "IMG" : "FILE"}</i><span><strong>{file.fileName}</strong><small>{fileSize(file.sizeBytes)} · Shared for your account</small></span><b>Open ↗</b></a>)}{!data.files.some((file) => file.caseId === project.caseId) && <p className={styles.empty}>No file has been shared with you for this project.</p>}</div></article>)}</section>}

          {view === "report" && <div className={styles.reportLayout}>
            <form className={styles.reportForm} onSubmit={submit}><header><div><span>{missingDate ? "CATCH-UP REQUIRED" : "END OF DAY"}</span><h2>{readableDate(reportDate || data.today)}</h2></div><b>{selectedProject?.projectCode || "No project"}</b></header>
              {reportConflict && currentReport && <div role="alert" style={{ margin: "0 0 12px", padding: "10px 12px", border: "1px solid rgba(255,120,90,.6)", background: "rgba(255,120,90,.08)", fontSize: 13 }}>A report for this day was already sent from another screen: &ldquo;{currentReport.completedWork}&rdquo;{currentReport.issuesDelays ? ` — issues: ${currentReport.issuesDelays}` : ""}. Your text below is kept; sending is refused unless you choose to replace that report. <button type="button" onClick={() => updateDraft({ opened: currentVersion })}>Replace it with my report</button></div>}
              {!reportConflict && currentReport && <p role="status" style={{ margin: "0 0 12px", fontSize: 13 }}>You already sent a report for this day. Sending again replaces it.</p>}
              {working && <p role="status" style={{ margin: "0 0 10px", fontSize: 13 }}>Sending your report… the fields unlock as soon as it is saved (so nothing typed meanwhile can be lost when the form moves to the next day).</p>}
              <label><span>Project worked on</span><select value={projectId} onChange={(event) => setProjectId(Number(event.target.value))} required disabled={working}><option value="">Select assigned project</option>{data.projects.map((project) => <option key={project.caseId} value={project.caseId}>{project.projectCode} · {project.siteLabel}</option>)}</select></label>
              <label><span>What work did you complete?</span><textarea value={completedWork} disabled={working} onChange={(event) => setCompletedWork(event.target.value)} placeholder="Write exactly what you completed during this work session…" required /></label>
              <label><span>What is your next step?</span><textarea value={nextStep} disabled={working} onChange={(event) => setNextStep(event.target.value)} placeholder="Describe the next action needed. Do not enter a future date…" required /></label>
              <label><span>Issue or delay · optional</span><textarea value={issuesDelays} disabled={working} onChange={(event) => setIssuesDelays(event.target.value)} placeholder="Materials, access, safety, coordination or anything management must know…" /></label>
              <button disabled={working || !data.projects.length}>{working ? "Submitting…" : missingDate ? "Submit missing report" : "Submit to Owner & Admin"}</button>
            </form>
            <aside className={styles.reportHistory}><header><span>MY REPORTS</span><strong>{data.reports.length} submitted</strong></header>{data.reports.slice(0, 8).map((report) => <article key={report.id}><div><strong>{readableDate(report.workDate)}</strong><span>{report.projectCode}</span></div><p>{report.completedWork}</p><small><b>Next:</b> {report.nextStep}</small><i>{report.status}</i></article>)}{!data.reports.length && <p className={styles.empty}>Your submitted reports will appear here.</p>}</aside>
          </div>}
        </>}
      </div>
    </section>
  </main>;
}

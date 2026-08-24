"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { LayoutDashboard, Workflow as WorkflowIcon, ListChecks, TriangleAlert, ArrowRight as ArrowRightIcon, FolderKanban, CalendarDays, ClipboardCheck, FileText, MessageSquare, Briefcase, type LucideIcon } from "lucide-react";
import BrandLogo from "../BrandLogo";
import Link from "next/link";
import WorkflowBoard from "../workflow/WorkflowBoard";
import TaskInbox from "../tasks/TaskInbox";
import OperationsControlPanel from "../operations/OperationsControlPanel";
import styles from "./supervisor.module.css";

type View = "overview" | "workflow" | "tasks" | "issues" | "followups" | "projects" | "schedule" | "checklist" | "report" | "messages";

const nav: Array<{ id: View; icon: LucideIcon; label: string }> = [
  { id: "overview", icon: LayoutDashboard, label: "Site overview" },
  { id: "workflow", icon: WorkflowIcon, label: "Site Visit workflow" },
  { id: "tasks", icon: ListChecks, label: "Assigned tasks" },
  { id: "issues", icon: TriangleAlert, label: "Delays & site problems" },
  { id: "followups", icon: ArrowRightIcon, label: "Tomorrow follow-ups" },
  { id: "projects", icon: FolderKanban, label: "Assigned projects" },
  { id: "schedule", icon: CalendarDays, label: "My schedule" },
  { id: "checklist", icon: ClipboardCheck, label: "Site checklist" },
  { id: "report", icon: FileText, label: "End-of-day report" },
  { id: "messages", icon: MessageSquare, label: "Team messages" },
];
function NavIcon({ icon: Icon }: { icon: LucideIcon }) { return <Icon size={17} strokeWidth={1.75} />; }
function MetricIcon({ icon: Icon }: { icon: LucideIcon }) { return <i className={styles.metricIcon}><Icon size={16} strokeWidth={1.75} /></i>; }

type AssignedProject = { caseId: number; projectCode: string; service: string; suburb: string; stage: string; progress: number; assignedSupervisorName?: string };
type AssignedTask = { id: number; projectCode: string; title: string; instructions: string; priority: string; status: string };

const demoDirections = [
  { time: "07:30", title: "Confirm plumbing set-out", project: "ATP-2026-00124", tone: "gold" },
  { time: "10:00", title: "Framing inspection", project: "ATP-2026-00124", tone: "green" },
  { time: "13:30", title: "Upload marked-up site photos", project: "ATP-2026-00124", tone: "blue" },
  { time: "15:45", title: "Submit end-of-day report", project: "ATP-2026-00124", tone: "orange" },
];

const demoProjects: AssignedProject[] = [
  { caseId: 124, projectCode: "ATP-2026-00124", service: "Home Renovation", suburb: "Glen Waverley", stage: "Construction", progress: 62, assignedSupervisorName: "Site Supervisor Preview" },
  { caseId: 131, projectCode: "ATP-2026-00131", service: "Engineering", suburb: "Rowville", stage: "Site inspection", progress: 28, assignedSupervisorName: "Site Supervisor Preview" },
];

const checks = ["Site access clear and secure", "PPE and amenities checked", "Framing dimensions verified", "Plumbing set-out confirmed", "Photos uploaded to project", "Weather and delay notes recorded"];
const todayLabel = () => new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Melbourne" }).format(new Date());

export default function SiteSupervisor({ previewTasks = false }: { previewTasks?: boolean }) {
  const [view, setView] = useState<View>("overview");
  const [checked, setChecked] = useState<Record<string, boolean>>(previewTasks ? { "Site access clear and secure": true, "PPE and amenities checked": true, "Framing dimensions verified": true } : {});
  const [reportSent, setReportSent] = useState(false);
  const [message, setMessage] = useState("");
  const [projects, setProjects] = useState<AssignedProject[]>(previewTasks ? demoProjects : []);
  const [directions, setDirections] = useState<AssignedTask[]>(previewTasks ? demoDirections.map((item, index) => ({ id: index + 1, projectCode: item.project, title: item.title, instructions: "Preview management direction", priority: "Normal", status: index < 2 ? "completed" : "assigned" })) : []);
  const [openIssues, setOpenIssues] = useState(previewTasks ? 1 : 0);
  const [dataError, setDataError] = useState("");
  const completed = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const openDirections = useMemo(() => directions.filter((task) => task.status !== "completed"), [directions]);
  const selectedProject = projects[0] ?? null;

  useEffect(() => {
    let active = true;
    const staticPreview = window.location.pathname.includes("/AlertConstruction/");
    if (previewTasks || staticPreview) {
      const frame = window.requestAnimationFrame(() => {
        if (!active) return;
        setProjects(demoProjects);
        setDirections(demoDirections.map((item, index) => ({ id: index + 1, projectCode: item.project, title: item.title, instructions: "Preview management direction", priority: "Normal", status: index < 2 ? "completed" : "assigned" })));
        setOpenIssues(1);
      });
      return () => { active = false; window.cancelAnimationFrame(frame); };
    }
    void Promise.all([
      fetch("/api/workflow", { cache: "no-store" }).then((response) => response.json().then((result) => ({ response, result }))),
      fetch("/api/tasks", { cache: "no-store" }).then((response) => response.json().then((result) => ({ response, result }))),
      fetch("/api/operations", { cache: "no-store" }).then((response) => response.json().then((result) => ({ response, result }))),
    ]).then(([workflow, taskData, operations]) => {
      if (!workflow.response.ok || !taskData.response.ok || !operations.response.ok) throw new Error("Live Site Supervisor data could not be loaded.");
      if (!active) return;
      setProjects((workflow.result.data?.cases ?? []).map((item: Record<string, unknown>) => ({
        caseId: Number(item.id ?? 0),
        projectCode: String(item.projectCode || item.requestCode || ""),
        service: String(item.service || "Project"),
        suburb: String(item.suburb || "Site"),
        stage: String(item.stage || "Assigned"),
        progress: Math.max(0, Math.min(100, Number(item.progress ?? 0))),
        assignedSupervisorName: String(item.assignedSupervisorName || "Site Supervisor"),
      })));
      setDirections(taskData.result.data?.tasks ?? []);
      setOpenIssues(Number(operations.result.data?.metrics?.openIssues ?? 0));
    }).catch((reason: unknown) => { if (active) setDataError(reason instanceof Error ? reason.message : "Live data could not be loaded."); });
    return () => { active = false; };
  }, [previewTasks]);
  const heading: Record<View, [string, string, string]> = {
    overview: ["Operation Hub · Site Supervisor", "Good morning, Site Supervisor.", "Your assigned projects, site directions and reporting tools — without private finance or pricing."],
    workflow: ["Assigned hand-offs", "Site Visit workflow", "Upload mandatory site evidence, submit Visit Reports and send internal and customer-safe updates."],
    tasks: ["Management direction", "Assigned tasks", "Only tasks that Owner or Admin assigned to your Site Supervisor account appear here."],
    issues: ["Immediate escalation", "Delays & site problems", "Report a trade delay or site problem immediately so Admin can review and reschedule it."],
    followups: ["Daily task continuity", "Tomorrow & upcoming follow-ups", "Clock out with a clear next action so nothing is forgotten on the next working day."],
    projects: ["Assigned work", "My projects", "Only projects allocated to your role are visible here."],
    schedule: ["Site direction", "My schedule", "Owner and Admin instructions for upcoming site work."],
    checklist: ["Quality control", "Site checklist", "Record the checks completed before work moves forward."],
    report: ["Daily reporting", "End-of-day report", "Send progress, delays, photos and tomorrow's requirements to the Owner."],
    messages: ["Team coordination", "Messages", "Keep project instructions and site updates together."],
  };

  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href="/"><BrandLogo kind="tradie" tone="dark" className={styles.logo} /></Link>
      <div className={styles.roleCard}><span>SS</span><div><small>AUTHENTICATED ROLE</small><strong>Site Supervisor 01</strong><b>Site delivery access</b></div></div>
      <nav>{nav.map((item) => <button key={item.id} className={view === item.id ? styles.active : ""} onClick={() => setView(item.id)}><i><NavIcon icon={item.icon} /></i><span>{item.label}</span>{item.id === "checklist" && <b>{completed}/6</b>}</button>)}</nav>
      <div className={styles.restricted}><span>RESTRICTED BY OWNER</span><strong>Finance · Quotes · Profit</strong><small>Private pricing and management controls are never sent to this role.</small></div>
      <div className={styles.sidebarFoot}><span><i /> Secure session active</span><Link href="/">Public website ↗</Link></div>
    </aside>

    <section className={styles.main}>
      <header className={styles.topbar}><span>{todayLabel()}<strong>Alert Tradie Pro · Operation Hub</strong></span><div><b>SS</b><span>Site Supervisor<small>ATP field team</small></span></div></header>
      <div className={styles.content}>
        {previewTasks && <div className={styles.dataNotice} role="note"><strong>Anonymous GitHub design preview</strong><span>All projects, tasks and percentages on this page are labelled demo data. The production workspace starts at zero and loads only assigned database records.</span></div>}
        <section className={styles.heading}><div><p>{heading[view][0]}</p><h1>{heading[view][1]}</h1><span>{heading[view][2]}</span></div><button onClick={() => setView("report")}>＋ Daily report</button></section>
        {dataError && <div className={styles.dataNotice} role="alert"><strong>Live data unavailable</strong><span>{dataError}</span></div>}

        {view === "workflow" && <WorkflowBoard role="supervisor" />}
        {view === "tasks" && <><TaskInbox role="Site Supervisor" preview={previewTasks} tone="light" /><OperationsControlPanel role="supervisor" mode="followups" preview={previewTasks} /></>}
        {view === "issues" && <OperationsControlPanel role="supervisor" mode="issues" preview={previewTasks} />}
        {view === "followups" && <OperationsControlPanel role="supervisor" mode="followups" preview={previewTasks} />}
        {view === "overview" && <>
          <OperationsControlPanel role="supervisor" mode="alerts" preview={previewTasks} />
          <section className={styles.metrics}><article><MetricIcon icon={Briefcase} /><span>ASSIGNED PROJECTS</span><strong>{projects.length}</strong><small>{projects.filter((project) => project.stage.toLowerCase() !== "complete").length} active</small></article><article><MetricIcon icon={ListChecks} /><span>OPEN DIRECTIONS</span><strong>{openDirections.length}</strong><small>{directions.filter((task) => task.status === "completed").length} completed</small></article><article><MetricIcon icon={ClipboardCheck} /><span>CHECKLIST</span><strong>{completed}/{checks.length}</strong><small>Today&apos;s site checks</small></article><article><MetricIcon icon={TriangleAlert} /><span>OPEN SITE ISSUES</span><strong>{openIssues}</strong><small>Live operations record</small></article></section>
          <div className={styles.overviewGrid}>
            <section className={styles.panel}><header><div><span>MANAGEMENT DIRECTION</span><h2>Assigned work</h2></div><button onClick={() => setView("tasks")}>Open tasks →</button></header><div className={styles.taskList}>{directions.slice(0, 5).map((task) => <article key={task.id}><time>{task.status === "completed" ? "DONE" : "OPEN"}</time><i className={styles[task.priority === "Urgent" ? "orange" : task.priority === "High" ? "gold" : "blue"]} /><div><strong>{task.title}</strong><small>{task.projectCode} · {task.instructions}</small></div><button onClick={() => setView("tasks")}>Open →</button></article>)}{directions.length === 0 && <div className={styles.emptyState}><strong>No direction assigned.</strong><span>New Owner or Admin tasks will appear here.</span></div>}</div></section>
            <section className={styles.panel}><header><div><span>QUALITY CONTROL</span><h2>Checklist progress</h2></div><button onClick={() => setView("checklist")}>Open checklist →</button></header><div className={styles.progressRing}><div style={{ "--progress": `${completed / checks.length * 360}deg` } as CSSProperties}><span><strong>{completed}</strong> of {checks.length}</span></div><p><strong>Framing checks underway</strong><small>Complete every relevant item before submitting today&apos;s report.</small></p></div></section>
          </div>
          <section className={`${styles.panel} ${styles.projectTable}`}><header><div><span>ASSIGNED PROJECTS</span><h2>Projects in motion</h2></div><button onClick={() => setView("projects")}>View projects →</button></header><div className={styles.tableHead}><span>Project</span><span>Current stage</span><span>Delivery</span><span>Next direction</span></div>{projects.map((project) => { const next = openDirections.find((task) => task.projectCode === project.projectCode); return <article key={project.caseId}><div><strong>{project.service} · {project.suburb}</strong><small>{project.projectCode} · {project.suburb}</small></div><span>{project.stage.replaceAll("_", " ")}</span><span><i><b style={{ width: `${project.progress}%` }} /></i>{project.progress}%</span><strong>{next?.title ?? "No open direction"}</strong></article>; })}{projects.length === 0 && <div className={styles.emptyState}><strong>No project assigned.</strong><span>Assigned projects will appear after Admin completes the hand-off.</span></div>}</section>
        </>}

        {view === "projects" && <section className={styles.projectCards}>{projects.map((project) => { const next = openDirections.find((task) => task.projectCode === project.projectCode); return <article key={project.caseId}><p>{project.projectCode}</p><h2>{project.service} · {project.suburb}</h2><span>{project.stage.replaceAll("_", " ")}</span><div><i><b style={{ width: `${project.progress}%` }} /></i><strong>{project.progress}%</strong></div><dl><dt>Next direction</dt><dd>{next?.title ?? "No open direction"}</dd><dt>Data source</dt><dd>Live approved project record</dd></dl><button onClick={() => setView("checklist")}>Open site checklist</button></article>; })}{projects.length === 0 && <div className={styles.emptyState}><strong>No project assigned.</strong><span>This workspace starts at zero until Admin assigns a live project.</span></div>}</section>}

        {view === "schedule" && <section className={styles.panel}><header><div><span>SITE SUPERVISOR TASKS</span><h2>Upcoming directions</h2></div></header><div className={styles.schedule}>{openDirections.map((task) => <article key={task.id}><time><strong>—</strong><span>NO<br />FAKE DATE</span></time><i className={styles[task.priority === "Urgent" ? "orange" : task.priority === "High" ? "gold" : "blue"]} /><div><strong>{task.title}</strong><small>{task.projectCode} · {task.instructions}</small></div><span>{task.status.replaceAll("_", " ")}</span></article>)}{openDirections.length === 0 && <div className={styles.emptyState}><strong>No upcoming direction.</strong><span>Dates and tasks appear only after management saves them.</span></div>}</div></section>}

        {view === "checklist" && <section className={styles.panel}><header><div><span>{selectedProject?.projectCode || "NO PROJECT"}</span><h2>Quality inspection checklist</h2></div><strong>{selectedProject ? `${completed} of ${checks.length} complete` : "0 complete"}</strong></header>{selectedProject ? <div className={styles.checklist}>{checks.map((item, index) => <label key={item}><input type="checkbox" checked={Boolean(checked[item])} onChange={() => setChecked((current) => ({ ...current, [item]: !current[item] }))} /><span>{checked[item] ? "✓" : index + 1}</span><div><strong>{item}</strong><small>{checked[item] ? "Completed in this session" : "Tap to confirm when complete"}</small></div></label>)}</div> : <div className={styles.emptyState}><strong>No assigned project.</strong><span>A quality inspection starts only after a project is assigned.</span></div>}</section>}

        {view === "report" && <form className={`${styles.panel} ${styles.report}`} onSubmit={(event) => { event.preventDefault(); if (selectedProject) setReportSent(true); }}><header><div><span>END-OF-DAY</span><h2>Daily site report</h2></div><strong>{selectedProject?.projectCode || "No project assigned"}</strong></header><div className={styles.formGrid}><label><span>Work completed</span><textarea required disabled={!selectedProject} /></label><label><span>Delay or issue</span><textarea disabled={!selectedProject} /></label><label><span>Tomorrow&apos;s requirement</span><textarea required disabled={!selectedProject} /></label><label><span>Site photos</span><div className={styles.upload}>＋ Add customer-safe and internal photos</div></label></div><button disabled={!selectedProject}>Submit report to Owner</button>{!selectedProject && <p>No report can be submitted until a project is assigned.</p>}{reportSent && <p>✓ Report submitted to Owner approval.</p>}</form>}

        {view === "messages" && <section className={`${styles.panel} ${styles.messages}`}><header><div><span>PROJECT CHANNEL</span><h2>Owner & Admin</h2></div></header><div>{previewTasks ? <><article><small>Admin Preview · 9:12 am</small><p>Please confirm the plumbing set-out before the trade starts.</p></article><article className={styles.mine}><small>Site Supervisor Preview · 9:36 am</small><p>Confirmed. Marked-up photos are ready to upload.</p></article></> : <div className={styles.emptyState}><strong>No message history.</strong><span>Messages will appear after the secure channel receives its first item.</span></div>}</div><form onSubmit={(event) => { event.preventDefault(); setMessage(""); }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message Owner and Admin…" /><button>Send ↑</button></form></section>}
      </div>
    </section>
  </main>;
}

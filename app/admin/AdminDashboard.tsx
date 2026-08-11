"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "../BrandLogo";
import styles from "./admin.module.css";

type View = "overview" | "projects" | "requests" | "schedule" | "messages";
type Resource = "project" | "request" | "schedule" | "message";
type Project = { id: number; code: string; name: string; service: string; stage: string; progress: number; customerName: string; suburb: string; startDate: string; notes: string; updatedAt: string };
type JobRequest = { id: number; code: string; requestType: "Project Request" | "Job Request"; customerName: string; contact: string; service: string; suburb: string; submittedAt: string; status: string; priority: string; summary: string; assignedTo: string; updatedAt: string };
type ScheduleEvent = { id: number; eventDate: string; startTime: string; title: string; assignee: string; projectCode: string; tone: string; notes: string };
type Message = { id: number; sender: string; recipient: string; body: string; sentAt: string };
type Permissions = { role: string; projects: number; schedule: number; finance: number; financeExport: number };
type Snapshot = { projects: Project[]; requests: JobRequest[]; scheduleEvents: ScheduleEvent[]; messages: Message[]; permissions: Permissions };

const empty: Snapshot = { projects: [], requests: [], scheduleEvents: [], messages: [], permissions: { role: "Admin", projects: 1, schedule: 1, finance: 0, financeExport: 0 } };
const nav: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Operations overview", icon: "◇" },
  { id: "projects", label: "Projects", icon: "▦" },
  { id: "requests", label: "New requests", icon: "◎" },
  { id: "schedule", label: "Schedule", icon: "□" },
  { id: "messages", label: "Team messages", icon: "↗" },
];
const services = ["Home Renovation", "Bathroom Renovation", "Kitchen Renovation", "Home Extension", "New Home", "Building Inspection", "Maintenance & Repairs", "Engineering"];
const stages = ["Admin review", "Site inspection", "Estimate", "Quote sent", "Customer approval", "Scheduled", "Construction", "Handover", "Complete"];
const requestStatuses = ["New", "Contacted", "Needs review", "Site visit booked", "Converted", "Closed"];
const assignees = ["Unassigned", "Admin 01", "Site Supervisor 01", "Estimator 01", "Engineer 01"];
const projectBlank = { code: "", name: "", service: "Home Renovation", stage: "Admin review", progress: "0", customerName: "", suburb: "", startDate: "", notes: "" };
const scheduleBlank = { eventDate: "2026-08-10", startTime: "08:00", title: "", assignee: "Site Supervisor 01", projectCode: "Business / General", tone: "gold", notes: "" };

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00+10:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", options ?? { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function AdminDashboard({ viewerName, viewerEmail, previewAsOwner }: { viewerName: string; viewerEmail: string; previewAsOwner: boolean }) {
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [projectModal, setProjectModal] = useState<Project | "new" | null>(null);
  const [projectForm, setProjectForm] = useState(projectBlank);
  const [requestModal, setRequestModal] = useState<JobRequest | null>(null);
  const [requestForm, setRequestForm] = useState({ status: "New", priority: "Normal", assignedTo: "Unassigned", summary: "" });
  const [scheduleModal, setScheduleModal] = useState<ScheduleEvent | "new" | null>(null);
  const [scheduleForm, setScheduleForm] = useState(scheduleBlank);
  const [requestFilter, setRequestFilter] = useState("All requests");
  const [projectQuery, setProjectQuery] = useState("");
  const [recipient, setRecipient] = useState("Site Supervisor 01");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/data", { cache: "no-store" });
        if (response.status === 401) { router.refresh(); return; }
        const result = await response.json() as { data?: Snapshot; error?: string };
        if (!response.ok || !result.data) throw new Error(result.error ?? "Admin data could not be loaded.");
        if (active) setData(result.data);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Admin data could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  async function mutate(method: "POST" | "PATCH" | "DELETE", resource: Resource, payload: Record<string, unknown> = {}, id?: number, message = "Saved.") {
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/admin/data", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resource, payload, id }) });
      if (response.status === 401) { router.refresh(); return false; }
      const result = await response.json() as { data?: Snapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The change could not be saved.");
      setData(result.data);
      setNotice(message);
      window.setTimeout(() => setNotice(""), 3500);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The change could not be saved.");
      return false;
    } finally { setWorking(false); }
  }

  function choose(next: View) { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function openProject(project?: Project, request?: JobRequest) {
    setProjectModal(project ?? "new");
    setProjectForm(project ? { code: project.code, name: project.name, service: project.service, stage: project.stage, progress: String(project.progress), customerName: project.customerName, suburb: project.suburb, startDate: project.startDate, notes: project.notes } : request ? { code: request.code.replace(/^(REQ|JOB)/, "ATP"), name: `${request.service} · ${request.suburb}`, service: request.service, stage: "Admin review", progress: "0", customerName: request.customerName, suburb: request.suburb, startDate: "", notes: `${request.summary}\nSource request: ${request.code}` } : { ...projectBlank });
  }
  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...projectForm, progress: Number(projectForm.progress) };
    const ok = projectModal === "new" ? await mutate("POST", "project", payload, undefined, "Project created and added to operations.") : await mutate("PATCH", "project", payload, projectModal?.id, "Project details updated.");
    if (ok) setProjectModal(null);
  }
  function openRequest(request: JobRequest) {
    setRequestModal(request);
    setRequestForm({ status: request.status, priority: request.priority, assignedTo: request.assignedTo, summary: request.summary });
  }
  async function saveRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestModal && await mutate("PATCH", "request", requestForm, requestModal.id, "Request follow-up saved.")) setRequestModal(null);
  }
  function openSchedule(item?: ScheduleEvent) {
    setScheduleModal(item ?? "new");
    setScheduleForm(item ? { eventDate: item.eventDate, startTime: item.startTime, title: item.title, assignee: item.assignee, projectCode: item.projectCode, tone: item.tone, notes: item.notes } : { ...scheduleBlank, projectCode: data.projects[0]?.code ?? "Business / General" });
  }
  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = scheduleModal === "new" ? await mutate("POST", "schedule", scheduleForm, undefined, `Work scheduled for ${scheduleForm.assignee}.`) : await mutate("PATCH", "schedule", scheduleForm, scheduleModal?.id, "Scheduled work updated.");
    if (ok) setScheduleModal(null);
  }
  async function removeSchedule(item: ScheduleEvent) {
    if (window.confirm(`Remove ${item.title} from the schedule?`)) await mutate("DELETE", "schedule", {}, item.id, "Schedule item removed.");
  }
  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    if (await mutate("POST", "message", { recipient, body: draft.trim() }, undefined, `Message sent to ${recipient}.`)) setDraft("");
  }
  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  const newRequests = data.requests.filter((request) => ["New", "Needs review"].includes(request.status));
  const activeProjects = data.projects.filter((project) => project.stage !== "Complete");
  const todayItems = data.scheduleEvents.filter((item) => item.eventDate === "2026-08-09");
  const filteredRequests = requestFilter === "All requests" ? data.requests : data.requests.filter((request) => request.requestType === requestFilter);
  const filteredProjects = useMemo(() => data.projects.filter((project) => `${project.code} ${project.name} ${project.suburb}`.toLowerCase().includes(projectQuery.toLowerCase())), [data.projects, projectQuery]);
  const headers: Record<View, [string, string, string]> = {
    overview: ["Operation Hub · Admin", "Keep delivery moving.", "Requests, projects, site time and team direction in one black-and-gold operational command centre."],
    projects: ["Project control", "Projects", "Create and update operational project records without access to private finance."],
    requests: ["Intake & follow-up", "New requests", "Review new project and job requests, contact customers and assign the next action."],
    schedule: ["Site coordination", "Schedule", "Send clear dates, times and task directions to the Site Supervisor and team."],
    messages: ["Team coordination", "Messages", "Keep project follow-up and site direction inside the management portal."],
  };

  return <main className={styles.adminShell}>
    <aside className={styles.sidebar}>
      <Link className={styles.brandLink} href="/"><BrandLogo kind="tradie" tone="dark" className={styles.sidebarLogo} /></Link>
      <div className={styles.roleCard}><span>AD</span><div><small>{previewAsOwner ? "Owner preview mode" : "Authenticated role"}</small><strong>{previewAsOwner ? "Admin workspace" : viewerName}</strong><b>Operational access</b></div></div>
      <nav className={styles.sidebarNav}>{nav.map((item) => <button key={item.id} className={view === item.id ? styles.activeNav : ""} onClick={() => choose(item.id)}><i>{item.icon}</i><span>{item.label}</span>{item.id === "requests" && newRequests.length > 0 && <b>{newRequests.length}</b>}</button>)}</nav>
      <div className={styles.restrictedCard}><span>Restricted by Owner</span><strong>Finance · Team Management</strong><small>Owner controls are not available.</small></div>
      <div className={styles.sidebarBottom}><div><i /><span>Secure session active</span></div>{previewAsOwner ? <Link href="/owner">← Back to Owner</Link> : <button onClick={signOut}>Sign out</button>}<Link href="/">Public website ↗</Link></div>
    </aside>
    <section className={styles.mainPanel}>
      <header className={styles.topbar}><div className={styles.mobileBrand}><BrandLogo kind="tradie" tone="dark" className={styles.mobileLogo} /></div><div><span>Monday, 10 August 2026</span><strong>Alert Tradie Pro · Operation Hub</strong></div><div className={styles.profileChip}><span>AD</span><div><strong>{previewAsOwner ? "Admin preview" : viewerName}</strong><small>{viewerEmail}</small></div></div></header>
      <div className={styles.content}>
        <section className={styles.pageHeading}><div><p className={styles.eyebrow}>{headers[view][0]}</p><h1>{headers[view][1]}</h1><p>{headers[view][2]}</p></div><div className={styles.headingActions}>{view === "projects" && <button className={styles.primaryButton} onClick={() => openProject()}>＋ New project</button>}{view === "schedule" && <button className={styles.primaryButton} onClick={() => openSchedule()}>＋ Schedule site time</button>}{view === "overview" && <><button className={styles.secondaryButton} onClick={() => choose("requests")}>Review requests</button><button className={styles.primaryButton} onClick={() => openSchedule()}>Schedule work</button></>}</div></section>
        {(notice || error) && <div className={`${styles.notice} ${error ? styles.errorNotice : ""}`}><span>{error ? "!" : "✓"}</span>{error || notice}<button onClick={() => { setNotice(""); setError(""); }}>×</button></div>}
        {loading ? <div className={styles.loading}><i />Opening live operations…</div> : <>
          {view === "overview" && <>
            <section className={styles.metricStrip}><article><span>New requests</span><strong>{newRequests.length}</strong><small>Need follow-up</small></article><article><span>Active projects</span><strong>{activeProjects.length}</strong><small>{data.projects.length} project records</small></article><article><span>Today on site</span><strong>{todayItems.length}</strong><small>Scheduled actions</small></article><article><span>Team messages</span><strong>{data.messages.length}</strong><small>Saved conversation entries</small></article></section>
            <section className={styles.overviewGrid}><article className={styles.panel}><div className={styles.panelHeading}><div><span>Priority intake</span><h2>Requests requiring action</h2></div><button onClick={() => choose("requests")}>Open all →</button></div><div className={styles.requestQueue}>{newRequests.slice(0, 4).map((request) => <button key={request.id} onClick={() => openRequest(request)}><i className={styles[`priority${request.priority}`]} /><div><small>{request.requestType} · {request.code}</small><strong>{request.service} — {request.suburb}</strong><p>{request.customerName} · {request.status}</p></div><span>→</span></button>)}</div></article><article className={styles.panel}><div className={styles.panelHeading}><div><span>Site direction</span><h2>Next scheduled work</h2></div><button onClick={() => choose("schedule")}>Full schedule →</button></div><div className={styles.nextSchedule}>{data.scheduleEvents.slice(0, 4).map((item) => <button key={item.id} onClick={() => openSchedule(item)}><time>{formatDate(item.eventDate, { day: "2-digit", month: "short" })}<small>{item.startTime}</small></time><i className={styles[`tone_${item.tone}`]} /><div><strong>{item.title}</strong><small>{item.assignee} · {item.projectCode}</small></div></button>)}</div></article></section>
            <section className={`${styles.panel} ${styles.projectTable}`}><div className={styles.panelHeading}><div><span>Operational portfolio</span><h2>Projects in motion</h2></div><button onClick={() => choose("projects")}>Manage projects →</button></div><div className={styles.tableHeader}><span>Project</span><span>Stage</span><span>Delivery</span><span>Next action</span></div>{activeProjects.slice(0, 5).map((project) => <button className={styles.projectRow} key={project.id} onClick={() => openProject(project)}><div><i /><span><strong>{project.name}</strong><small>{project.code} · {project.suburb || project.service}</small></span></div><span>{project.stage}</span><div><i><b style={{ width: `${project.progress}%` }} /></i><span>{project.progress}%</span></div><strong>{project.notes || "Review project record"}</strong></button>)}</section>
          </>}

          {view === "projects" && <><div className={styles.controlBar}><label><span>⌕</span><input value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="Search project, ATP code or suburb" /></label><div><span>{filteredProjects.length} operational records</span><button onClick={() => openProject()}>＋ Add project</button></div></div><section className={styles.projectCards}>{filteredProjects.map((project) => <article key={project.id}><div className={styles.projectCardTop}><span>{project.code}</span><i>{project.stage}</i></div><h2>{project.name}</h2><p>{project.customerName || "Customer not assigned"} · {project.suburb || project.service}</p><div className={styles.progress}><span><b>{project.progress}%</b> delivered</span><i><b style={{ width: `${project.progress}%` }} /></i></div><dl><div><dt>Service</dt><dd>{project.service}</dd></div><div><dt>Start</dt><dd>{project.startDate ? formatDate(project.startDate, { day: "numeric", month: "short" }) : "TBC"}</dd></div></dl><p className={styles.projectNote}>{project.notes || "No operational note yet."}</p><button className={styles.outlineButton} onClick={() => openProject(project)}>Edit project details</button></article>)}</section></>}

          {view === "requests" && <><div className={styles.segmented}>{["All requests", "Project Request", "Job Request"].map((filter) => <button key={filter} className={requestFilter === filter ? styles.segmentActive : ""} onClick={() => setRequestFilter(filter)}>{filter}</button>)}</div><section className={styles.requestGrid}>{filteredRequests.map((request) => <article className={styles.panel} key={request.id}><header><div><span>{request.requestType}</span><strong>{request.code}</strong></div><i className={styles[`priority${request.priority}`]}>{request.priority}</i></header><div className={styles.requestBody}><small>{request.service}</small><h2>{request.customerName}</h2><p>{request.suburb} · {request.contact}</p><blockquote>{request.summary}</blockquote><dl><div><dt>Status</dt><dd>{request.status}</dd></div><div><dt>Assigned to</dt><dd>{request.assignedTo}</dd></div><div><dt>Received</dt><dd>{formatDate(request.submittedAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</dd></div></dl></div><footer><button onClick={() => openRequest(request)}>Follow up</button><button className={styles.primaryButton} onClick={() => openProject(undefined, request)}>Create project →</button></footer></article>)}</section></>}

          {view === "schedule" && <><section className={styles.weekCalendar}>{Array.from({ length: 7 }, (_, index) => index + 9).map((day) => <article key={day}><header><small>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day - 9]}</small><span>{day}</span></header>{data.scheduleEvents.filter((item) => Number(item.eventDate.slice(-2)) === day).map((item) => <button key={item.id} className={styles[`event_${item.tone}`]} onClick={() => openSchedule(item)}><strong>{item.startTime}</strong><span>{item.title}</span><small>{item.assignee}</small></button>)}</article>)}</section><section className={`${styles.panel} ${styles.scheduleList}`}><div className={styles.panelHeading}><div><span>Site Supervisor & team time</span><h2>Scheduled work</h2></div><button onClick={() => openSchedule()}>＋ Send time & task</button></div>{data.scheduleEvents.map((item) => <div key={item.id}><time>{formatDate(item.eventDate, { day: "2-digit", month: "short" })}<small>{item.startTime}</small></time><i className={styles[`tone_${item.tone}`]} /><div><strong>{item.title}</strong><small>{item.projectCode} · {item.assignee}{item.notes ? ` · ${item.notes}` : ""}</small></div><div><button onClick={() => openSchedule(item)}>Edit</button><button onClick={() => removeSchedule(item)}>Remove</button></div></div>)}</section></>}

          {view === "messages" && <section className={`${styles.panel} ${styles.messageWorkspace}`}><aside><p className={styles.eyebrow}>Team channels</p>{["Site Supervisor 01", "Owner", "Estimator 01", "Engineer 01"].map((person) => <button key={person} className={recipient === person ? styles.selectedPerson : ""} onClick={() => setRecipient(person)}><span>{person.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{person}</strong><small>{person === "Site Supervisor 01" ? "On site" : "Team member"}</small></div></button>)}</aside><section><header><span>{recipient.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{recipient}</strong><small>Management portal conversation</small></div></header><div>{data.messages.filter((message) => message.sender === recipient || message.recipient === recipient || (recipient === "Owner" && [message.sender, message.recipient].includes("Owner"))).map((message) => <article key={message.id} className={message.sender === "Admin" ? styles.ownMessage : styles.teamMessage}><small>{message.sender}</small><p>{message.body}</p><span>{formatDate(message.sentAt, { hour: "numeric", minute: "2-digit" })}</span></article>)}</div><form onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${recipient}…`} /><button disabled={working}>Send ↑</button></form></section></section>}
        </>}
      </div>
    </section>

    <nav className={styles.mobileNav}>{nav.map((item) => <button key={item.id} className={view === item.id ? styles.activeMobileNav : ""} onClick={() => choose(item.id)}><i>{item.icon}</i><span>{item.label.split(" ")[0]}</span></button>)}</nav>

    {projectModal && <div className={styles.modalBackdrop} onMouseDown={() => setProjectModal(null)}><form className={styles.recordModal} onSubmit={saveProject} onMouseDown={(event) => event.stopPropagation()}><button type="button" onClick={() => setProjectModal(null)}>×</button><p className={styles.eyebrow}>Operational project record</p><h2>{projectModal === "new" ? "Create project" : "Edit project"}</h2><div className={styles.formGrid}>{[["ATP project code", "code", "text"], ["Project name", "name", "text"], ["Customer name", "customerName", "text"], ["Suburb", "suburb", "text"], ["Progress %", "progress", "number"], ["Start date", "startDate", "date"]].map(([label, key, type]) => <label key={key}><span>{label}</span><input type={type} value={projectForm[key as keyof typeof projectForm]} onChange={(event) => setProjectForm((current) => ({ ...current, [key]: event.target.value }))} required={["code", "name"].includes(key)} /></label>)}<label><span>Service</span><select value={projectForm.service} onChange={(event) => setProjectForm((current) => ({ ...current, service: event.target.value }))}>{services.map((service) => <option key={service}>{service}</option>)}</select></label><label><span>Stage</span><select value={projectForm.stage} onChange={(event) => setProjectForm((current) => ({ ...current, stage: event.target.value }))}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label><label className={styles.fullField}><span>Operational note</span><textarea value={projectForm.notes} onChange={(event) => setProjectForm((current) => ({ ...current, notes: event.target.value }))} /></label></div><div className={styles.restrictedNotice}>Private contract values, balances and Finance records remain Owner-only.</div><button className={styles.primaryButton} disabled={working}>{working ? "Saving…" : "Save project"}</button></form></div>}

    {requestModal && <div className={styles.modalBackdrop} onMouseDown={() => setRequestModal(null)}><form className={styles.recordModal} onSubmit={saveRequest} onMouseDown={(event) => event.stopPropagation()}><button type="button" onClick={() => setRequestModal(null)}>×</button><p className={styles.eyebrow}>{requestModal.requestType} · {requestModal.code}</p><h2>Follow up request</h2><div className={styles.requestSummary}><strong>{requestModal.customerName}</strong><span>{requestModal.service} · {requestModal.suburb}</span><small>{requestModal.contact}</small></div><div className={styles.formGrid}><label><span>Status</span><select value={requestForm.status} onChange={(event) => setRequestForm((current) => ({ ...current, status: event.target.value }))}>{requestStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label><span>Priority</span><select value={requestForm.priority} onChange={(event) => setRequestForm((current) => ({ ...current, priority: event.target.value }))}>{["Normal", "High", "Urgent"].map((priority) => <option key={priority}>{priority}</option>)}</select></label><label className={styles.fullField}><span>Assign next action to</span><select value={requestForm.assignedTo} onChange={(event) => setRequestForm((current) => ({ ...current, assignedTo: event.target.value }))}>{assignees.map((assignee) => <option key={assignee}>{assignee}</option>)}</select></label><label className={styles.fullField}><span>Follow-up note</span><textarea value={requestForm.summary} onChange={(event) => setRequestForm((current) => ({ ...current, summary: event.target.value }))} /></label></div><button className={styles.primaryButton} disabled={working}>Save follow-up</button></form></div>}

    {scheduleModal && <div className={styles.modalBackdrop} onMouseDown={() => setScheduleModal(null)}><form className={styles.recordModal} onSubmit={saveSchedule} onMouseDown={(event) => event.stopPropagation()}><button type="button" onClick={() => setScheduleModal(null)}>×</button><p className={styles.eyebrow}>Site time & direction</p><h2>{scheduleModal === "new" ? "Schedule work" : "Edit scheduled work"}</h2><div className={styles.formGrid}>{[["Date", "eventDate", "date"], ["Start time", "startTime", "time"], ["Task / work", "title", "text"]].map(([label, key, type]) => <label key={key}><span>{label}</span><input type={type} value={scheduleForm[key as keyof typeof scheduleForm]} onChange={(event) => setScheduleForm((current) => ({ ...current, [key]: event.target.value }))} required /></label>)}<label><span>Assignee</span><select value={scheduleForm.assignee} onChange={(event) => setScheduleForm((current) => ({ ...current, assignee: event.target.value }))}>{assignees.filter((item) => item !== "Unassigned").map((assignee) => <option key={assignee}>{assignee}</option>)}</select></label><label><span>Project</span><select value={scheduleForm.projectCode} onChange={(event) => setScheduleForm((current) => ({ ...current, projectCode: event.target.value }))}><option>Business / General</option>{data.projects.map((project) => <option key={project.id} value={project.code}>{project.code}</option>)}</select></label><label><span>Calendar colour</span><select value={scheduleForm.tone} onChange={(event) => setScheduleForm((current) => ({ ...current, tone: event.target.value }))}><option value="gold">Gold</option><option value="blue">Blue</option><option value="green">Green</option><option value="orange">Orange</option></select></label><label className={styles.fullField}><span>Site direction / note</span><textarea value={scheduleForm.notes} onChange={(event) => setScheduleForm((current) => ({ ...current, notes: event.target.value }))} /></label></div><button className={styles.primaryButton} disabled={working}>{working ? "Saving…" : `Send time to ${scheduleForm.assignee}`}</button></form></div>}
  </main>;
}

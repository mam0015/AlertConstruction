"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { OperationsSnapshot, SiteIssue } from "./types";
import styles from "./operations.module.css";

type Role = "owner" | "admin" | "supervisor";
type Mode = "alerts" | "issues" | "followups" | "project-status";

const empty: OperationsSnapshot = {
  viewer: { email: "", role: "Admin", name: "" },
  today: "",
  tomorrow: "",
  projects: [],
  issues: [],
  followUps: [],
  metrics: { openIssues: 0, criticalIssues: 0, dueToday: 0, overdue: 0 },
};

const trades = ["Electrician", "Plumber", "Carpenter", "Tiler", "Plasterer", "Engineer", "Supplier", "Site access", "Weather", "Other"];
const issueTypes = ["Trade delay", "Material delay", "Drawing / design issue", "Site access", "Safety issue", "Quality issue", "Weather delay", "Other problem"];
const staticStorageKey = "alert-tradie-pro-operations-static-v1";

function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function staticSnapshot(role: Role): OperationsSnapshot {
  const identity = role === "owner"
    ? { email: "owner.preview@example.invalid", role: "Owner" as const, name: "Owner Preview" }
    : role === "admin"
      ? { email: "admin@alerttradiepro.demo", role: "Admin" as const, name: "Admin 01" }
      : { email: "site.supervisor@alerttradiepro.demo", role: "Site Supervisor" as const, name: "Site Supervisor 01" };
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(staticStorageKey) : null;
  const shared = stored ? JSON.parse(stored) as Pick<OperationsSnapshot, "issues" | "followUps"> : {
    issues: [{ id: 501, caseId: 124, projectCode: "ATP-2026-00124", projectName: "Glen Waverley renovation", siteLocation: "41 Orchard Street, Glen Waverley", affectedTrade: "Electrician", issueType: "Trade delay", severity: "High" as const, summary: "Electrician cannot attend the confirmed rough-in", details: "The electrician advised that the current booking cannot be met and a replacement date is required.", impact: "Wall lining cannot start until the electrical rough-in is completed.", contactedPerson: "Electrical contractor", contactedAt: new Date().toISOString(), expectedDate: localDate(2), reporterEmail: "site.supervisor@alerttradiepro.demo", reporterName: "Site Supervisor 01", status: "reported" as const, adminAction: "", rescheduledDate: "", rescheduledTime: "", rescheduledAssignee: "", adminEmail: "", adminReviewedAt: "", ownerNote: "", reportedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), resolvedAt: "" }],
    followUps: [{ id: 601, personEmail: identity.email, personRole: identity.role, personName: identity.name, projectCode: "ATP-2026-00124", title: "Confirm electrician replacement booking", details: "Check the revised attendance time and update the Site Supervisor.", targetDate: localDate(1), source: "clock_out" as const, status: "open" as const, createdByEmail: identity.email, createdByRole: identity.role, workDate: localDate(), clockedOutAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: "" }],
  };
  const issues = role === "supervisor" ? shared.issues.filter((issue) => issue.reporterEmail === identity.email) : shared.issues;
  const followUps = role === "supervisor" ? shared.followUps.filter((item) => item.personEmail === identity.email) : shared.followUps;
  const today = localDate();
  return { viewer: identity, today, tomorrow: localDate(1), projects: [{ caseId: 124, projectCode: "ATP-2026-00124", projectName: "Glen Waverley renovation", siteLocation: "41 Orchard Street, Glen Waverley" }], issues, followUps, metrics: { openIssues: issues.filter((item) => item.status !== "resolved").length, criticalIssues: issues.filter((item) => item.status !== "resolved" && item.severity === "Critical").length, dueToday: followUps.filter((item) => item.status === "open" && item.targetDate === today).length, overdue: followUps.filter((item) => item.status === "open" && item.targetDate < today).length } };
}

function readable(value: string, withTime = false) {
  if (!value) return "Not set";
  const date = new Date(value.length === 10 ? `${value}T12:00:00+10:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-AU", withTime ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function OperationsControlPanel({ role, mode, preview = false, staticMode = false }: { role: Role; mode: Mode; preview?: boolean; staticMode?: boolean }) {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [issueProject, setIssueProject] = useState(0);
  const [issueLocation, setIssueLocation] = useState("");
  const [affectedTrade, setAffectedTrade] = useState("Electrician");
  const [issueType, setIssueType] = useState("Trade delay");
  const [severity, setSeverity] = useState("High");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [impact, setImpact] = useState("");
  const [contactedPerson, setContactedPerson] = useState("");
  const [contactedAt, setContactedAt] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [issueDrafts, setIssueDrafts] = useState<Record<number, { action: string; date: string; time: string; assignee: string; ownerNote: string }>>({});
  const [followProject, setFollowProject] = useState("Business / General");
  const [followTitle, setFollowTitle] = useState("");
  const [followDetails, setFollowDetails] = useState("");
  const [followDate, setFollowDate] = useState("");
  const [clockProject, setClockProject] = useState("Business / General");
  const [clockTitle, setClockTitle] = useState("");
  const [clockDetails, setClockDetails] = useState("");
  const query = preview ? `?previewRole=${role}` : "";

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (staticMode) {
        const snapshot = staticSnapshot(role);
        setData(snapshot);
        setFollowDate((current) => current || snapshot.tomorrow);
        setIssueProject(snapshot.projects[0]?.caseId ?? 0);
        setIssueLocation(snapshot.projects[0]?.siteLocation ?? "");
        return;
      }
      const response = await fetch(`/api/operations${query}`, { cache: "no-store" });
      const result = await response.json() as { data?: OperationsSnapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Operations alerts could not be loaded.");
      const liveData = result.data;
      setData(liveData);
      setFollowDate((current) => current || liveData.tomorrow);
      if (!issueProject && liveData.projects[0]) {
        setIssueProject(liveData.projects[0].caseId);
        setIssueLocation(liveData.projects[0].siteLocation);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Operations alerts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { queueMicrotask(() => void load()); }, [query, staticMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const openIssues = useMemo(() => data.issues.filter((issue) => issue.status !== "resolved"), [data.issues]);
  const followUps = useMemo(() => data.followUps.filter((item) => item.status !== "cancelled"), [data.followUps]);

  async function action(name: string, payload: Record<string, unknown>, success: string) {
    setWorking(true); setError("");
    try {
      if (staticMode) {
        setData((current) => {
          const now = new Date().toISOString();
          let issues = [...current.issues];
          let followUps = [...current.followUps];
          const issueId = Number(payload.issueId);
          if (name === "create_issue") issues = [{ id: Date.now(), caseId: Number(payload.caseId), projectCode: current.projects.find((item) => item.caseId === Number(payload.caseId))?.projectCode ?? "ATP PROJECT", projectName: current.projects.find((item) => item.caseId === Number(payload.caseId))?.projectName ?? "Assigned project", siteLocation: String(payload.siteLocation), affectedTrade: String(payload.affectedTrade), issueType: String(payload.issueType), severity: String(payload.severity) as SiteIssue["severity"], summary: String(payload.summary), details: String(payload.details), impact: String(payload.impact), contactedPerson: String(payload.contactedPerson), contactedAt: String(payload.contactedAt), expectedDate: String(payload.expectedDate), reporterEmail: current.viewer.email, reporterName: current.viewer.name, status: "reported", adminAction: "", rescheduledDate: "", rescheduledTime: "", rescheduledAssignee: "", adminEmail: "", adminReviewedAt: "", ownerNote: "", reportedAt: now, updatedAt: now, resolvedAt: "" }, ...issues];
          if (name === "review_issue") issues = issues.map((item) => item.id === issueId ? { ...item, status: "under_review", adminAction: String(payload.adminAction), adminEmail: current.viewer.email, adminReviewedAt: now, updatedAt: now } : item);
          if (name === "reschedule_issue") {
            const issue = issues.find((item) => item.id === issueId);
            issues = issues.map((item) => item.id === issueId ? { ...item, status: "rescheduled", adminAction: String(payload.adminAction), rescheduledDate: String(payload.rescheduledDate), rescheduledTime: String(payload.rescheduledTime), rescheduledAssignee: String(payload.rescheduledAssignee), adminEmail: current.viewer.email, adminReviewedAt: now, updatedAt: now } : item);
            if (issue) followUps = [{ id: Date.now() + 1, personEmail: issue.reporterEmail, personRole: "Site Supervisor", personName: issue.reporterName, projectCode: issue.projectCode, title: `Follow up ${issue.affectedTrade} delay`, details: String(payload.adminAction), targetDate: String(payload.rescheduledDate), source: "site_issue", status: "open", createdByEmail: current.viewer.email, createdByRole: current.viewer.role, workDate: current.today, clockedOutAt: "", createdAt: now, updatedAt: now, completedAt: "" }, ...followUps];
          }
          if (name === "resolve_issue") issues = issues.map((item) => item.id === issueId ? { ...item, status: "resolved", adminAction: String(payload.adminAction), resolvedAt: now, updatedAt: now } : item);
          if (name === "owner_note") issues = issues.map((item) => item.id === issueId ? { ...item, ownerNote: String(payload.ownerNote), updatedAt: now } : item);
          if (name === "create_follow_up" || name === "clock_out_follow_up") followUps = [{ id: Date.now(), personEmail: current.viewer.email, personRole: current.viewer.role, personName: current.viewer.name, projectCode: String(payload.projectCode), title: String(payload.title), details: String(payload.details), targetDate: String(payload.targetDate), source: name === "clock_out_follow_up" ? "clock_out" : "manual", status: "open", createdByEmail: current.viewer.email, createdByRole: current.viewer.role, workDate: current.today, clockedOutAt: name === "clock_out_follow_up" ? now : "", createdAt: now, updatedAt: now, completedAt: "" }, ...followUps.filter((item) => !(name === "clock_out_follow_up" && item.source === "clock_out" && item.personEmail === current.viewer.email && item.workDate === current.today))];
          if (name === "set_follow_up_status") followUps = followUps.map((item) => item.id === Number(payload.followUpId) ? { ...item, status: String(payload.status) as typeof item.status, updatedAt: now, completedAt: payload.status === "completed" ? now : "" } : item);
          const next = { ...current, issues, followUps, metrics: { openIssues: issues.filter((item) => item.status !== "resolved").length, criticalIssues: issues.filter((item) => item.status !== "resolved" && item.severity === "Critical").length, dueToday: followUps.filter((item) => item.status === "open" && item.targetDate === current.today).length, overdue: followUps.filter((item) => item.status === "open" && item.targetDate < current.today).length } };
          window.localStorage.setItem(staticStorageKey, JSON.stringify({ issues, followUps }));
          return next;
        });
        setNotice(success); window.setTimeout(() => setNotice(""), 4500); return true;
      }
      const response = await fetch(`/api/operations${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, payload }) });
      const result = await response.json() as { data?: OperationsSnapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The operation could not be saved.");
      setData(result.data); setNotice(success); window.setTimeout(() => setNotice(""), 4500); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The operation could not be saved."); return false; }
    finally { setWorking(false); }
  }

  async function submitIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await action("create_issue", { caseId: issueProject, siteLocation: issueLocation, affectedTrade, issueType, severity, summary, details, impact, contactedPerson, contactedAt, expectedDate }, "Site issue sent immediately to Admin and Owner.");
    if (ok) { setSummary(""); setDetails(""); setImpact(""); setContactedPerson(""); setContactedAt(""); setExpectedDate(""); }
  }

  function draft(issue: SiteIssue) {
    return issueDrafts[issue.id] ?? { action: issue.adminAction, date: issue.rescheduledDate || data.tomorrow, time: issue.rescheduledTime || "08:00", assignee: issue.rescheduledAssignee || issue.reporterName || "Site Supervisor 01", ownerNote: issue.ownerNote };
  }

  function patchDraft(issue: SiteIssue, values: Partial<ReturnType<typeof draft>>) {
    setIssueDrafts((current) => ({ ...current, [issue.id]: { ...draft(issue), ...values } }));
  }

  async function createFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action("create_follow_up", { projectCode: followProject, title: followTitle, details: followDetails, targetDate: followDate }, "Upcoming follow-up saved.")) {
      setFollowTitle(""); setFollowDetails("");
    }
  }

  async function clockOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await action("clock_out_follow_up", { projectCode: clockProject, title: clockTitle, details: clockDetails, targetDate: data.tomorrow }, "Clock-out recorded. Tomorrow’s follow-up is now in Daily Tasks.")) {
      setClockTitle(""); setClockDetails("");
    }
  }

  if (loading) return <section className={styles.loading}><i />Loading live site operations…</section>;

  if (mode === "alerts") return <section className={styles.alertShell}>
    <header><div><span>LIVE SITE CONTROL</span><h2>Delays & problems requiring attention</h2><p>New Site Supervisor reports appear here as soon as they are submitted.</p></div><b className={openIssues.length ? styles.alertCount : styles.clearCount}>{openIssues.length}<small>OPEN</small></b></header>
    {(error || notice) && <div className={`${styles.notice} ${error ? styles.error : ""}`}>{error || notice}</div>}
    <div className={styles.alertList}>{openIssues.slice(0, 3).map((issue) => <article key={issue.id} className={styles[`severity${issue.severity}`]}><div><span>{issue.severity} · {issue.issueType}</span><strong>{issue.projectCode} · {issue.siteLocation}</strong><p>{issue.affectedTrade}: {issue.summary}</p></div><i>{statusLabel(issue.status)}</i></article>)}{!openIssues.length && <div className={styles.clearState}><b>✓</b><span><strong>No open site delay reported.</strong><small>New reports will appear here automatically.</small></span></div>}</div>
  </section>;

  if (mode === "project-status") return <section className={styles.statusShell}>
    <header><div><span>OWNER PROJECT SITUATION</span><h2>Live project risk status</h2><p>Every unresolved site issue is attached to its project and visible in the Owner activity trail.</p></div><div><strong>{data.metrics.openIssues}</strong><small>AT RISK</small></div></header>
    {(error || notice) && <div className={`${styles.notice} ${error ? styles.error : ""}`}>{error || notice}</div>}
    <div className={styles.statusGrid}>{data.projects.map((project) => { const issues = openIssues.filter((issue) => issue.caseId === project.caseId); return <article key={project.caseId} className={issues.length ? styles.atRisk : styles.onTrack}><div><span>{project.projectCode}</span><i>{issues.length ? "AT RISK" : "ON TRACK"}</i></div><h3>{project.projectName}</h3><p>{project.siteLocation}</p>{issues.length ? issues.map((issue) => <small key={issue.id}><b>{issue.affectedTrade}</b> — {issue.summary} · {statusLabel(issue.status)}</small>) : <small>No open delay or site problem.</small>}</article>; })}</div>
  </section>;

  if (mode === "issues") return <section className={styles.issueWorkspace}>
    {(error || notice) && <div className={`${styles.notice} ${error ? styles.error : ""}`}>{error || notice}</div>}
    {role === "supervisor" && <form className={styles.issueForm} onSubmit={submitIssue}>
      <header><span>MANDATORY SITE ESCALATION</span><h2>Report a delay or site problem</h2><p>Use this as soon as a trade, delivery, drawing, access or safety problem can affect the project.</p></header>
      <div className={styles.formGrid}>
        <label className={styles.wide}><span>Project</span><select value={issueProject} onChange={(event) => { const id = Number(event.target.value); setIssueProject(id); const project = data.projects.find((item) => item.caseId === id); if (project) setIssueLocation(project.siteLocation); }} required><option value={0}>Choose assigned project</option>{data.projects.map((project) => <option key={project.caseId} value={project.caseId}>{project.projectCode} · {project.projectName}</option>)}</select></label>
        <label className={styles.wide}><span>Exact project location</span><input value={issueLocation} onChange={(event) => setIssueLocation(event.target.value)} placeholder="41 Orchard Street, Glen Waverley" required /></label>
        <label><span>Affected trade / source</span><select value={affectedTrade} onChange={(event) => setAffectedTrade(event.target.value)}>{trades.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Problem type</span><select value={issueType} onChange={(event) => setIssueType(event.target.value)}>{issueTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>Normal</option><option>High</option><option>Critical</option></select></label>
        <label><span>New expected date</span><input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} /></label>
        <label className={styles.wide}><span>Short alert summary</span><input value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Electrician cannot attend the confirmed rough-in" required /></label>
        <label className={styles.wide}><span>What happened?</span><textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Explain what was confirmed, what changed and what information Admin needs…" required /></label>
        <label className={styles.wide}><span>Impact on the project</span><textarea value={impact} onChange={(event) => setImpact(event.target.value)} placeholder="Example: wall lining cannot begin until rough-in is completed." required /></label>
        <label><span>Person contacted</span><input value={contactedPerson} onChange={(event) => setContactedPerson(event.target.value)} placeholder="Trade name / company" /></label>
        <label><span>Contacted at</span><input type="datetime-local" value={contactedAt} onChange={(event) => setContactedAt(event.target.value)} /></label>
      </div>
      <button disabled={working || !data.projects.length}>{working ? "Sending alert…" : "Report issue to Admin & Owner"}</button>
    </form>}
    <section className={styles.issueRegister}><header><div><span>{role === "supervisor" ? "MY SITE REPORTS" : "MANAGEMENT ISSUE REGISTER"}</span><h2>{role === "supervisor" ? "Reported delays & problems" : "Review, reschedule and close"}</h2></div><b>{openIssues.length} open</b></header>
      <div className={styles.issueCards}>{data.issues.map((issue) => { const values = draft(issue); return <article key={issue.id} className={issue.status === "resolved" ? styles.resolved : ""}>
        <div className={styles.issueTop}><span className={styles[`severity${issue.severity}`]}>{issue.severity}</span><strong>{issue.issueType}</strong><i>{statusLabel(issue.status)}</i></div>
        <h3>{issue.projectCode} · {issue.siteLocation}</h3><h4>{issue.affectedTrade}: {issue.summary}</h4><p>{issue.details}</p>
        <dl><div><dt>Project impact</dt><dd>{issue.impact || "Not supplied"}</dd></div><div><dt>Reported by</dt><dd>{issue.reporterName} · {readable(issue.reportedAt, true)}</dd></div><div><dt>Trade contacted</dt><dd>{issue.contactedPerson || "Not recorded"}{issue.contactedAt ? ` · ${readable(issue.contactedAt, true)}` : ""}</dd></div><div><dt>Expected date</dt><dd>{readable(issue.expectedDate)}</dd></div></dl>
        {issue.adminAction && <div className={styles.managementDirection}><span>ADMIN ACTION</span><strong>{issue.adminAction}</strong><small>{issue.rescheduledDate ? `${readable(issue.rescheduledDate)} at ${issue.rescheduledTime} · ${issue.rescheduledAssignee}` : statusLabel(issue.status)}</small></div>}
        {issue.ownerNote && <div className={styles.ownerDirection}><span>OWNER DIRECTION</span><strong>{issue.ownerNote}</strong></div>}
        {role !== "supervisor" && issue.status !== "resolved" && <div className={styles.actionBox}><label><span>Management action / direction</span><textarea value={values.action} onChange={(event) => patchDraft(issue, { action: event.target.value })} placeholder="Record what Admin has confirmed and what happens next…" /></label><div><label><span>New date</span><input type="date" value={values.date} onChange={(event) => patchDraft(issue, { date: event.target.value })} /></label><label><span>Time</span><input type="time" value={values.time} onChange={(event) => patchDraft(issue, { time: event.target.value })} /></label><label><span>Assign to</span><input value={values.assignee} onChange={(event) => patchDraft(issue, { assignee: event.target.value })} /></label></div><footer><button disabled={working} onClick={() => void action("review_issue", { issueId: issue.id, adminAction: values.action }, "Issue marked under review.")}>Start review</button><button disabled={working} onClick={() => void action("reschedule_issue", { issueId: issue.id, adminAction: values.action, rescheduledDate: values.date, rescheduledTime: values.time, rescheduledAssignee: values.assignee }, "Schedule updated and Site Supervisor follow-up created.")}>Reschedule Site Supervisor</button><button disabled={working} onClick={() => void action("resolve_issue", { issueId: issue.id, adminAction: values.action }, "Issue resolved and project situation updated.")}>Resolve issue</button></footer></div>}
        {role === "owner" && <div className={styles.ownerBox}><label><span>Owner direction</span><textarea value={values.ownerNote} onChange={(event) => patchDraft(issue, { ownerNote: event.target.value })} placeholder="Add Owner direction or escalation…" /></label><button disabled={working} onClick={() => void action("owner_note", { issueId: issue.id, ownerNote: values.ownerNote }, "Owner direction saved to the project activity.")}>Save Owner direction</button></div>}
      </article>; })}{!data.issues.length && <div className={styles.empty}><strong>No site issue reported yet.</strong><span>New Site Supervisor reports will appear here immediately.</span></div>}</div>
    </section>
  </section>;

  return <section className={styles.followWorkspace}>
    {(error || notice) && <div className={`${styles.notice} ${error ? styles.error : ""}`}>{error || notice}</div>}
    <section className={styles.followMetrics}><article><span>DUE TODAY</span><strong>{data.metrics.dueToday}</strong><small>Needs follow-up</small></article><article><span>OVERDUE</span><strong>{data.metrics.overdue}</strong><small>Still open</small></article><article><span>OPEN FOLLOW-UPS</span><strong>{followUps.filter((item) => item.status === "open").length}</strong><small>Management visibility</small></article></section>
    <div className={styles.followGrid}>
      <form className={styles.followForm} onSubmit={createFollowUp}><header><span>UPCOMING EVENT / REMINDER</span><h2>Add a follow-up</h2><p>Save an item that must be checked later. It will stay visible until completed.</p></header><label><span>Project</span><select value={followProject} onChange={(event) => setFollowProject(event.target.value)}><option>Business / General</option>{data.projects.map((project) => <option key={project.caseId}>{project.projectCode}</option>)}</select></label><label><span>Follow-up date</span><input type="date" value={followDate} onChange={(event) => setFollowDate(event.target.value)} required /></label><label><span>What needs follow-up?</span><input value={followTitle} onChange={(event) => setFollowTitle(event.target.value)} placeholder="Confirm electrician attendance" required /></label><label><span>Details</span><textarea value={followDetails} onChange={(event) => setFollowDetails(event.target.value)} placeholder="Add the exact call, approval or project action required…" /></label><button disabled={working}>{working ? "Saving…" : "Add upcoming follow-up"}</button></form>
      <form className={styles.clockForm} onSubmit={clockOut}><header><span>END OF SHIFT REQUIREMENT</span><h2>Tomorrow&apos;s follow-up</h2><p>Before clocking out, record the most important item you must continue or check tomorrow.</p></header><div className={styles.tomorrow}><span>TOMORROW</span><strong>{readable(data.tomorrow)}</strong></div><label><span>Project</span><select value={clockProject} onChange={(event) => setClockProject(event.target.value)}><option>Business / General</option>{data.projects.map((project) => <option key={project.caseId}>{project.projectCode}</option>)}</select></label><label><span>First follow-up tomorrow</span><input value={clockTitle} onChange={(event) => setClockTitle(event.target.value)} placeholder="Call the electrician and confirm arrival time" required /></label><label><span>Context / next step</span><textarea value={clockDetails} onChange={(event) => setClockDetails(event.target.value)} placeholder="Explain what must be checked and what outcome is needed…" required /></label><button disabled={working}>{working ? "Clocking out…" : "Clock out & save tomorrow task"}</button></form>
    </div>
    <section className={styles.followRegister}><header><div><span>DAILY TASK CONTINUITY</span><h2>Upcoming follow-ups</h2></div><b>{followUps.filter((item) => item.status === "open").length} open</b></header><div>{followUps.map((item) => <article key={item.id} className={item.status === "completed" ? styles.followComplete : ""}><time><strong>{readable(item.targetDate, false).split(" ")[0]}</strong><span>{readable(item.targetDate, false).split(" ").slice(1, 2)}</span></time><div><span>{item.source === "clock_out" ? "FROM CLOCK-OUT" : item.source === "site_issue" ? "SITE ISSUE FOLLOW-UP" : "UPCOMING EVENT"}</span><h3>{item.title}</h3><p>{item.details || "No extra detail."}</p><small>{item.projectCode} · {item.personName} ({item.personRole})</small></div><i>{item.status}</i>{item.status === "open" && <button disabled={working} onClick={() => void action("set_follow_up_status", { followUpId: item.id, status: "completed" }, "Follow-up completed.")}>Mark done</button>}</article>)}{!followUps.length && <div className={styles.empty}><strong>No upcoming follow-up.</strong><span>Add an event or save tomorrow’s task at clock-out.</span></div>}</div></section>
  </section>;
}

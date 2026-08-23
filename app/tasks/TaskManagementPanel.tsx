"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { TaskManagementSnapshot } from "./types";
import styles from "./tasks.module.css";

const empty: TaskManagementSnapshot = { viewerRole: "Admin", people: [], projects: [], tasks: [] };

function readable(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}

export default function TaskManagementPanel({ role, scope }: { role: "owner" | "admin"; scope: "operations" | "management" }) {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [assigneeEmail, setAssigneeEmail] = useState("");
  const [caseId, setCaseId] = useState(0);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState("Normal");
  const query = `?previewRole=${role}`;

  useEffect(() => {
    let active = true;
    void fetch(`/api/tasks/manage${query}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { data?: TaskManagementSnapshot; error?: string } }))
      .then(({ response, result }) => {
        if (!response.ok || !result.data) throw new Error(result.error ?? "Task centre could not be loaded.");
        if (!active) return;
        setData(result.data);
        const first = result.data.people.find((person) => person.group === scope);
        setAssigneeEmail(first?.email ?? "");
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Task centre could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, role, scope]);

  const people = useMemo(() => data.people.filter((person) => person.group === scope), [data.people, scope]);
  const emails = useMemo(() => new Set(people.map((person) => person.email)), [people]);
  const tasks = useMemo(() => data.tasks.filter((task) => emails.has(task.assigneeEmail)), [data.tasks, emails]);
  const open = tasks.filter((task) => task.status !== "completed").length;

  async function action(name: string, payload: Record<string, unknown>, success: string) {
    setWorking(true); setError("");
    try {
      const response = await fetch(`/api/tasks/manage${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: name, payload }) });
      const result = await response.json() as { data?: TaskManagementSnapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The task change could not be saved.");
      setData(result.data); setNotice(success); window.setTimeout(() => setNotice(""), 4200); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The task change could not be saved."); return false; }
    finally { setWorking(false); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const person = people.find((item) => item.email === assigneeEmail);
    if (await action("create_task", { assigneeEmail, caseId, title, instructions, priority }, `Task assigned to ${person?.title || assigneeEmail}.`)) {
      setTitle(""); setInstructions(""); setPriority("Normal");
    }
  }

  return <section className={styles.managerShell}>
    <header className={styles.managerHeader}>
      <div><span>{scope === "management" ? "OWNER-ONLY MANAGEMENT DIRECTION" : "OPERATIONAL TASK CONTROL"}</span><h2>{scope === "management" ? "Tasks for Admin & Manager" : "Tasks for Site Supervisors & Workers"}</h2><p>{scope === "management" ? "Only Owner can create, change or remove these management tasks." : "Owner and Admin can send clear work instructions to approved field and trade accounts."}</p></div>
      <div className={styles.summary}><strong>{open}</strong><span>OPEN TASKS</span><small>{people.length} approved people</small></div>
    </header>
    {(notice || error) && <div className={`${styles.notice} ${error ? styles.error : ""}`}><b>{error ? "!" : "✓"}</b><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}
    {loading ? <div className={styles.loading}><i />Opening task control…</div> : <div className={styles.managementGrid}>
      <form className={styles.taskForm} onSubmit={create}>
        <header><span>NEW ASSIGNMENT</span><h3>Give clear direction</h3></header>
        <label><span>Assign to</span><select value={assigneeEmail} onChange={(event) => setAssigneeEmail(event.target.value)} required><option value="">Choose approved team member</option>{people.map((person) => <option key={person.email} value={person.email}>{person.title} · {person.email}</option>)}</select></label>
        <label><span>Project</span><select value={caseId} onChange={(event) => setCaseId(Number(event.target.value))}><option value={0}>Business / General</option>{data.projects.map((project) => <option key={project.caseId} value={project.caseId}>{project.projectCode} · {project.siteLabel}</option>)}</select></label>
        <label><span>Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value)}><option>Normal</option><option>High</option><option>Urgent</option></select></label>
        <label><span>Task title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={scope === "management" ? "Review estimate approval pack" : "Confirm electrical rough-in"} required /></label>
        <label><span>Exact instructions</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Explain what must be completed and what result should be reported…" required /></label>
        <button disabled={working || !people.length}>{working ? "Sending…" : "Assign task"}</button>
      </form>
      <section className={styles.taskRegister}>
        <header><div><span>LIVE TASK REGISTER</span><h3>Assigned work and progress</h3></div><b>{tasks.length} total</b></header>
        <div className={styles.filters}><span>{tasks.filter((task) => task.status === "assigned").length} assigned</span><span>{tasks.filter((task) => task.status === "in_progress").length} in progress</span><span>{tasks.filter((task) => task.status === "completed").length} completed</span></div>
        {tasks.map((task) => <article className={styles.managementTask} key={task.id}>
          <div className={styles.taskTop}><i className={styles[`priority${task.priority}`]}>{task.priority}</i><span>{task.projectCode}</span><small>{readable(task.updatedAt)}</small></div>
          <h4>{task.title}</h4><p>{task.instructions}</p>
          <div className={styles.assignee}><b>{task.assigneeTitle.slice(0, 2).toUpperCase()}</b><span><strong>{task.assigneeTitle}</strong><small>{task.assigneeEmail}</small></span></div>
          <footer><select value={task.status} onChange={(event) => void action("set_status", { taskId: task.id, status: event.target.value }, `Task marked ${event.target.value.replaceAll("_", " ")}.`)}><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select><button onClick={() => void action("delete_task", { taskId: task.id }, "Task removed.")}>Remove</button></footer>
        </article>)}
        {!tasks.length && <div className={styles.empty}><strong>No tasks in this section.</strong><span>Create the first assignment from the form.</span></div>}
      </section>
    </div>}
  </section>;
}

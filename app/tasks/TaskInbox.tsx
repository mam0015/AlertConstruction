"use client";

import { useEffect, useMemo, useState } from "react";
import type { PersonalTaskSnapshot } from "./types";
import styles from "./tasks.module.css";

const empty: PersonalTaskSnapshot = { identity: { email: "", role: "", title: "" }, tasks: [] };

export default function TaskInbox({ role, preview = false, tone = "dark", compact = false }: { role: string; preview?: boolean; tone?: "dark" | "light"; compact?: boolean }) {
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(0);
  const [error, setError] = useState("");
  const query = preview ? `?previewRole=${encodeURIComponent(role)}` : "";

  useEffect(() => {
    let active = true;
    void fetch(`/api/tasks${query}`, { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() as { data?: PersonalTaskSnapshot; error?: string } }))
      .then(({ response, result }) => { if (!response.ok || !result.data) throw new Error(result.error ?? "Your tasks could not be loaded."); if (active) setData(result.data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Your tasks could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, role]);

  const open = useMemo(() => data.tasks.filter((task) => task.status !== "completed"), [data.tasks]);

  async function status(taskId: number, next: string) {
    setWorking(taskId); setError("");
    try {
      const response = await fetch(`/api/tasks${query}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set_status", payload: { taskId, status: next } }) });
      const result = await response.json() as { data?: PersonalTaskSnapshot; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "The task could not be updated.");
      setData(result.data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The task could not be updated."); }
    finally { setWorking(0); }
  }

  return <section className={`${styles.inbox} ${tone === "light" ? styles.light : ""} ${compact ? styles.compact : ""}`}>
    <header><div><span>MY ASSIGNED TASKS</span><h2>{data.identity.title || role}</h2><p>Directions assigned specifically to this account by {role === "Admin" || role === "Manager" ? "Owner" : "Owner or Admin"}.</p></div><b>{open.length}<small>OPEN</small></b></header>
    {error && <div className={`${styles.notice} ${styles.error}`}><b>!</b><span>{error}</span><button onClick={() => setError("")}>×</button></div>}
    {loading ? <div className={styles.loading}><i />Loading assigned tasks…</div> : <div className={styles.inboxGrid}>
      {data.tasks.map((task) => <article className={task.status === "completed" ? styles.complete : ""} key={task.id}>
        <div className={styles.taskTop}><i className={styles[`priority${task.priority}`]}>{task.priority}</i><span>{task.projectCode}</span><small>{task.status.replaceAll("_", " ")}</small></div>
        <h3>{task.title}</h3><p>{task.instructions}</p><small className={styles.creator}>Set by {task.createdByRole} · {task.siteLabel}</small>
        <footer>{task.status === "assigned" && <button disabled={working === task.id} onClick={() => void status(task.id, "in_progress")}>Start task</button>}{task.status === "in_progress" && <button disabled={working === task.id} onClick={() => void status(task.id, "completed")}>Mark completed</button>}{task.status === "completed" && <button disabled={working === task.id} onClick={() => void status(task.id, "in_progress")}>Reopen</button>}</footer>
      </article>)}
      {!data.tasks.length && <div className={styles.empty}><strong>No task assigned.</strong><span>New directions from management will appear here.</span></div>}
    </div>}
  </section>;
}

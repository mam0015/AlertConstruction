"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEntry, ChatMessage, StaffReport, TeamPerson } from "../../../db/team-store";
import styles from "./team-hub.module.css";

type Me = { email: string; role: string; name: string };
type Tab = "calendar" | "messages" | "report" | "team";
const MANAGEMENT = ["Owner", "Admin", "Manager"];

const pad = (value: number) => String(value).padStart(2, "0");
const iso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseIso = (value: string) => { const [y, m, d] = value.split("-").map(Number); return new Date(y, m - 1, d); };
const longDate = (value: string) => new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" }).format(parseIso(value));
const stamp = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date); };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const result = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || result.data === undefined) throw new Error(result.error ?? "Something went wrong. Please try again.");
  return result.data;
}

export default function TeamHub({ me, home }: { me: Me; home: string }) {
  const isManager = MANAGEMENT.includes(me.role);
  const [tab, setTab] = useState<Tab>("calendar");
  const [people, setPeople] = useState<TeamPerson[]>([]);
  const [projects, setProjects] = useState<Array<{ code: string; name: string }>>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    void api<{ people: TeamPerson[]; projects: Array<{ code: string; name: string }> }>("/api/team/people")
      .then((data) => { setPeople(data.people); setProjects(data.projects); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "The team list could not be loaded."));
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => void api<{ unread: Record<string, number> }>("/api/team/chat").then((data) => { if (active) setUnread(data.unread); }).catch(() => undefined);
    load();
    const timer = window.setInterval(load, 12000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const totalUnread = Object.values(unread).reduce((sum, value) => sum + value, 0);
  const others = people.filter((person) => person.email !== me.email.toLowerCase());
  const markRead = useCallback((peer: string) => setUnread((value) => value[peer] ? { ...value, [peer]: 0 } : value), []);
  const flash = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 3500); };

  async function signOut() {
    await fetch(me.role === "Owner" ? "/api/owner/logout" : "/api/admin/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/";
  }

  return <main className={styles.shell}>
    <header className={styles.top}>
      <div><h1>Team hub</h1><small>{me.name}</small></div>
      <div className={styles.topLinks}>
        <Link className={styles.btn} href={home}>← My workspace</Link>
        <button className={styles.btn} onClick={() => void signOut()}>Sign out</button>
      </div>
    </header>
    <nav className={styles.tabs} aria-label="Team hub sections">
      <button className={`${styles.tab} ${tab === "calendar" ? styles.tabActive : ""}`} onClick={() => setTab("calendar")}>Calendar</button>
      <button className={`${styles.tab} ${tab === "messages" ? styles.tabActive : ""}`} onClick={() => setTab("messages")}>Messages{totalUnread > 0 && <span className={styles.badge}>{totalUnread}</span>}</button>
      {me.role !== "Owner" && <button className={`${styles.tab} ${tab === "report" ? styles.tabActive : ""}`} onClick={() => setTab("report")}>End-of-day report</button>}
      {isManager && <button className={`${styles.tab} ${tab === "team" ? styles.tabActive : ""}`} onClick={() => setTab("team")}>Team</button>}
    </nav>
    <div className={styles.body}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {tab === "calendar" && <CalendarTab me={me} isManager={isManager} people={people} projects={projects} onError={setError} onNotice={flash} />}
      {tab === "messages" && <MessagesTab me={me} others={others} unread={unread} onRead={markRead} onError={setError} />}
      {tab === "report" && me.role !== "Owner" && <ReportTab projects={projects} onError={setError} onNotice={flash} />}
      {tab === "team" && isManager && <section className={styles.panel}><h2>Approved team ({people.length})</h2><div className={styles.roster}>{people.map((person) => <article key={person.email}><strong>{person.name}</strong><small>{person.role} · {person.email}</small>{person.email !== me.email.toLowerCase() && <p><button className={styles.btn} onClick={() => setTab("messages")}>Message</button></p>}</article>)}</div></section>}
    </div>
  </main>;
}

function CalendarTab({ me, isManager, people, projects, onError, onNotice }: { me: Me; isManager: boolean; people: TeamPerson[]; projects: Array<{ code: string; name: string }>; onError: (value: string) => void; onNotice: (value: string) => void }) {
  const today = iso(new Date());
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selected, setSelected] = useState(today);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [person, setPerson] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", startTime: "", assigneeEmail: "", projectCode: "", notes: "", untilDate: "", weekdaysOnly: true });

  const gridStart = useMemo(() => { const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const offset = (first.getDay() + 6) % 7; return new Date(first.getFullYear(), first.getMonth(), 1 - offset); }, [cursor]);
  const cells = useMemo(() => Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index)), [gridStart]);
  const from = iso(cells[0]); const to = iso(cells[41]);

  const [reloadTick, setReloadTick] = useState(0);
  useEffect(() => {
    let active = true;
    void api<CalendarEntry[]>(`/api/team/calendar?from=${from}&to=${to}${person ? `&person=${encodeURIComponent(person)}` : ""}`)
      .then((data) => { if (active) setEntries(data); })
      .catch((reason: unknown) => { if (active) onError(reason instanceof Error ? reason.message : "The calendar could not be loaded."); });
    return () => { active = false; };
  }, [from, to, person, onError, reloadTick]);
  const load = useCallback(async () => setReloadTick((value) => value + 1), []);

  const byDay = useMemo(() => { const map = new Map<string, CalendarEntry[]>(); for (const entry of entries) map.set(entry.entryDate, [...(map.get(entry.entryDate) ?? []), entry]); return map; }, [entries]);
  const dayEntries = byDay.get(selected) ?? [];

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); onError("");
    try {
      const dates: string[] = [];
      const end = form.untilDate && form.untilDate > selected ? parseIso(form.untilDate) : parseIso(selected);
      for (let day = parseIso(selected); day <= end; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
        const weekday = day.getDay();
        if (!form.weekdaysOnly || end.getTime() === parseIso(selected).getTime() || (weekday !== 0 && weekday !== 6)) dates.push(iso(day));
      }
      const created = await api<{ created: number }>("/api/team/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, dates }) });
      onNotice(`${created.created} calendar ${created.created === 1 ? "entry" : "entries"} saved. The assigned person sees ${created.created === 1 ? "it" : "them"} in their calendar.`);
      setForm((value) => ({ ...value, title: "", notes: "", untilDate: "" }));
      await load();
    } catch (reason) { onError(reason instanceof Error ? reason.message : "The entry could not be saved."); }
    finally { setBusy(false); }
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this calendar entry?")) return;
    try { await api("/api/team/calendar", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); await load(); }
    catch (reason) { onError(reason instanceof Error ? reason.message : "The entry could not be removed."); }
  }

  const monthLabel = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(cursor);

  return <div className={styles.calGrid}>
    <section className={styles.panel}>
      <div className={styles.monthBar}>
        <button className={styles.btn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
        <h2>{monthLabel}</h2>
        <button className={styles.btn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">›</button>
      </div>
      {isManager && <div className={styles.form} style={{ marginBottom: 12 }}><label>Show calendar of<select value={person} onChange={(event) => setPerson(event.target.value)}><option value="">Everyone</option>{people.map((p) => <option key={p.email} value={p.email}>{p.name}</option>)}</select></label></div>}
      <div className={styles.dow}>{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => <span key={d}>{d}</span>)}</div>
      <div className={styles.days}>{cells.map((date) => {
        const key = iso(date); const list = byDay.get(key) ?? [];
        return <button key={key} className={`${styles.day} ${date.getMonth() !== cursor.getMonth() ? styles.dayOther : ""} ${key === today ? styles.dayToday : ""} ${key === selected ? styles.daySel : ""}`} onClick={() => setSelected(key)}>
          <span className={styles.dayNum}>{date.getDate()}</span>
          {list.slice(0, 2).map((entry) => <span className={styles.chip} key={entry.id}>{entry.title}</span>)}
          {list.length > 2 && <span className={styles.more}>+{list.length - 2} more</span>}
        </button>;
      })}</div>
    </section>
    <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
      <section className={styles.panel}>
        <h2>{longDate(selected)}</h2>
        {dayEntries.length === 0 && <p className={styles.muted}>Nothing scheduled for this day.</p>}
        {dayEntries.map((entry) => <article className={styles.entry} key={entry.id}>
          <strong>{entry.startTime ? `${entry.startTime} · ` : ""}{entry.title}</strong>
          <small>For {entry.assigneeName}{entry.projectCode ? ` · ${entry.projectCode}` : ""}</small>
          <small>Assigned by {entry.createdByName} ({entry.createdByRole})</small>
          {entry.notes && <p>{entry.notes}</p>}
          {(me.role === "Owner" || entry.createdByEmail === me.email.toLowerCase()) && isManager && <p><button className={styles.btn} onClick={() => void remove(entry.id)}>Remove</button></p>}
        </article>)}
      </section>
      {isManager && <section className={styles.panel}>
        <h2>Assign work on {longDate(selected)}</h2>
        <form className={styles.form} onSubmit={(event) => void save(event)}>
          <label>Who is this for?<select value={form.assigneeEmail} onChange={(event) => setForm({ ...form, assigneeEmail: event.target.value })} required><option value="">Choose a team member…</option>{people.map((p) => <option key={p.email} value={p.email}>{p.name}</option>)}</select></label>
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Rough-in electrical at Parramatta" maxLength={160} required /></label>
          <div className={styles.row2}>
            <label>Start time<input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
            <label>Project<select value={form.projectCode} onChange={(event) => setForm({ ...form, projectCode: event.target.value })}><option value="">No project</option>{projects.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}</select></label>
          </div>
          <label>Repeat every day until (optional — build a month plan)<input type="date" min={selected} value={form.untilDate} onChange={(event) => setForm({ ...form, untilDate: event.target.value })} /></label>
          <label className={styles.check}><input type="checkbox" checked={form.weekdaysOnly} onChange={(event) => setForm({ ...form, weekdaysOnly: event.target.checked })} />Skip weekends when repeating</label>
          <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} maxLength={1000} /></label>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? "Saving…" : "Add to calendar"}</button>
        </form>
      </section>}
    </div>
  </div>;
}

function MessagesTab({ me, others, unread, onRead, onError }: { me: Me; others: TeamPerson[]; unread: Record<string, number>; onRead: (peer: string) => void; onError: (value: string) => void }) {
  const [peer, setPeer] = useState("*");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const load = () => void api<{ messages: ChatMessage[] }>(`/api/team/chat?with=${encodeURIComponent(peer)}`)
      .then((data) => { if (active) { setMessages(data.messages); onRead(peer); } })
      .catch((reason: unknown) => { if (active) onError(reason instanceof Error ? reason.message : "Messages could not be loaded."); });
    load();
    const timer = window.setInterval(load, 8000);
    return () => { active = false; window.clearInterval(timer); };
  }, [peer, onRead, onError]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length, peer]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !file) return;
    setBusy(true); onError("");
    try {
      const form = new FormData(); form.set("to", peer); form.set("body", text); if (file) form.set("file", file);
      const data = await api<{ messages: ChatMessage[] }>("/api/team/chat", { method: "POST", body: form });
      setMessages(data.messages); setText(""); setFile(null); if (fileRef.current) fileRef.current.value = "";
    } catch (reason) { onError(reason instanceof Error ? reason.message : "The message could not be sent."); }
    finally { setBusy(false); }
  }

  const peerName = peer === "*" ? "Whole team channel" : others.find((person) => person.email === peer)?.name ?? peer;
  return <div className={styles.chatGrid}>
    <aside className={styles.people} aria-label="Conversations">
      <button className={`${styles.person} ${peer === "*" ? styles.personActive : ""}`} onClick={() => setPeer("*")}><span><strong>Whole team channel</strong><small>Everyone sees these</small></span>{unread["*"] > 0 && <span className={styles.badge}>{unread["*"]}</span>}</button>
      {others.map((person) => <button key={person.email} className={`${styles.person} ${peer === person.email ? styles.personActive : ""}`} onClick={() => setPeer(person.email)}><span><strong>{person.name}</strong><small>{person.role}</small></span>{unread[person.email] > 0 && <span className={styles.badge}>{unread[person.email]}</span>}</button>)}
      {others.length === 0 && <p className={styles.muted} style={{ padding: 14 }}>No other approved team members yet.</p>}
    </aside>
    <section className={styles.thread}>
      <header>{peerName}</header>
      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.muted}>No messages yet. Say hello 👋</p>}
        {messages.map((message) => <div key={message.id} className={`${styles.msg} ${message.senderEmail === me.email.toLowerCase() ? styles.mine : ""}`}>
          <small>{message.senderEmail === me.email.toLowerCase() ? "You" : message.senderName} · {stamp(message.sentAt)}</small>
          {message.body}
          {message.fileUrl && <div><a href={message.fileUrl} target="_blank" rel="noreferrer">📎 {message.fileName}</a></div>}
        </div>)}
        <div ref={endRef} />
      </div>
      <form className={styles.compose} onSubmit={(event) => void send(event)}>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message…" maxLength={2000} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(event); } }} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy || (!text.trim() && !file)}>{busy ? "Sending…" : "Send"}</button>
      </form>
    </section>
  </div>;
}

function ReportTab({ projects, onError, onNotice }: { projects: Array<{ code: string; name: string }>; onError: (value: string) => void; onNotice: (value: string) => void }) {
  const [reports, setReports] = useState<StaffReport[]>([]);
  const [summary, setSummary] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void api<StaffReport[]>("/api/team/eod").then(setReports).catch((reason: unknown) => onError(reason instanceof Error ? reason.message : "Reports could not be loaded.")); }, [onError]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); onError("");
    try { setReports(await api<StaffReport[]>("/api/team/eod", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary, projectCode }) })); setSummary(""); onNotice("Your end-of-day report was sent to the Owner."); }
    catch (reason) { onError(reason instanceof Error ? reason.message : "The report could not be submitted."); }
    finally { setBusy(false); }
  }

  return <div className={styles.calGrid}>
    <section className={styles.panel}>
      <h2>Submit today&apos;s end-of-day report</h2>
      <p className={styles.muted}>Describe what you completed. Only the Owner can approve it or leave a note.</p>
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <label>Project (optional)<select value={projectCode} onChange={(event) => setProjectCode(event.target.value)}><option value="">General / not project-specific</option>{projects.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.name}</option>)}</select></label>
        <label>What did you do today?<textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={4000} required style={{ minHeight: 160 }} /></label>
        <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy || !summary.trim()}>{busy ? "Sending…" : "Send report to Owner"}</button>
      </form>
    </section>
    <section className={`${styles.panel} ${styles.reportList}`}>
      <h2>My recent reports</h2>
      {reports.length === 0 && <p className={styles.muted}>No reports yet.</p>}
      {reports.map((report) => <article key={report.id}>
        <span className={`${styles.status} ${styles[report.status as "Approved"] ?? ""}`}>{report.status === "Pending" ? "Waiting for Owner" : report.status}</span>
        <small className={styles.muted}> {stamp(report.submittedAt)} · {report.projectCode}</small>
        <p>{report.summary}</p>
        {report.ownerNote && <p><strong>Owner note:</strong> {report.ownerNote}</p>}
      </article>)}
    </section>
  </div>;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CalendarEntry, TeamPerson } from "../../db/team-store";
import styles from "../team/hub/team-hub.module.css";

const pad = (value: number) => String(value).padStart(2, "0");
const iso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export default function ManagerOverview() {
  const [people, setPeople] = useState<TeamPerson[]>([]);
  const [today, setToday] = useState<CalendarEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const day = iso(new Date());
    void Promise.all([
      fetch("/api/team/people", { cache: "no-store" }).then((response) => response.json() as Promise<{ data?: { people: TeamPerson[] }; error?: string }>),
      fetch(`/api/team/calendar?from=${day}&to=${day}`, { cache: "no-store" }).then((response) => response.json() as Promise<{ data?: CalendarEntry[]; error?: string }>),
    ]).then(([team, calendar]) => {
      if (!active) return;
      if (team.error || calendar.error) setError(team.error ?? calendar.error ?? "");
      setPeople(team.data?.people ?? []); setToday(calendar.data ?? []);
    }).catch(() => { if (active) setError("The team overview could not be loaded."); });
    return () => { active = false; };
  }, []);

  return <div style={{ display: "grid", gap: 18 }}>
    {error && <p className={styles.error}>{error}</p>}
    <section className={styles.panel}>
      <h2>Plan and talk to your team</h2>
      <p className={styles.muted}>Assign work to any team member on the calendar, message each person individually or the whole team, and share photos or documents.</p>
      <p style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><Link className={`${styles.btn} ${styles.btnPrimary}`} href="/team/hub">Open calendar &amp; messages</Link></p>
    </section>
    <section className={styles.panel}>
      <h2>Today across the team ({today.length})</h2>
      {today.length === 0 && <p className={styles.muted}>Nothing is scheduled for today.</p>}
      {today.map((entry) => <article className={styles.entry} key={entry.id}><strong>{entry.startTime ? `${entry.startTime} · ` : ""}{entry.title}</strong><small>For {entry.assigneeName}{entry.projectCode ? ` · ${entry.projectCode}` : ""} · assigned by {entry.createdByName}</small></article>)}
    </section>
    <section className={styles.panel}>
      <h2>Approved team ({people.length})</h2>
      <div className={styles.roster}>{people.map((person) => <article key={person.email}><strong>{person.name}</strong><small>{person.role} · {person.email}</small></article>)}</div>
    </section>
  </div>;
}

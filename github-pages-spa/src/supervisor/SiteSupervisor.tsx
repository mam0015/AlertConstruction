import { useMemo, useState, type CSSProperties } from "react";
import BrandLogo from "../BrandLogo";
import { Link } from "../router";
import WorkflowBoard from "../workflow/WorkflowBoard";
import styles from "./supervisor.module.css";

type View = "overview" | "workflow" | "projects" | "schedule" | "checklist" | "report" | "messages";

const nav: Array<{ id: View; icon: string; label: string }> = [
  { id: "overview", icon: "◇", label: "Site overview" },
  { id: "workflow", icon: "↻", label: "Site Visit workflow" },
  { id: "projects", icon: "▦", label: "Assigned projects" },
  { id: "schedule", icon: "□", label: "My schedule" },
  { id: "checklist", icon: "✓", label: "Site checklist" },
  { id: "report", icon: "+", label: "End-of-day report" },
  { id: "messages", icon: "↗", label: "Team messages" },
];

const tasks = [
  { time: "07:30", title: "Confirm plumbing set-out", project: "ATP-2026-00124", tone: "gold" },
  { time: "10:00", title: "Framing inspection", project: "ATP-2026-00124", tone: "green" },
  { time: "13:30", title: "Upload marked-up site photos", project: "ATP-2026-00124", tone: "blue" },
  { time: "15:45", title: "Submit end-of-day report", project: "ATP-2026-00124", tone: "orange" },
];

const checks = ["Site access clear and secure", "PPE and amenities checked", "Framing dimensions verified", "Plumbing set-out confirmed", "Photos uploaded to project", "Weather and delay notes recorded"];

export default function SiteSupervisor() {
  const [view, setView] = useState<View>("overview");
  const [checked, setChecked] = useState<Record<string, boolean>>({ "Site access clear and secure": true, "PPE and amenities checked": true, "Framing dimensions verified": true });
  const [reportSent, setReportSent] = useState(false);
  const [message, setMessage] = useState("");
  const completed = useMemo(() => Object.values(checked).filter(Boolean).length, [checked]);
  const heading: Record<View, [string, string, string]> = {
    overview: ["Operation Hub · Site Supervisor", "Good morning, Site Supervisor.", "Your assigned projects, site directions and reporting tools — without private finance or pricing."],
    workflow: ["Assigned hand-offs", "Site Visit workflow", "Upload mandatory site evidence, submit Visit Reports and send internal and customer-safe updates."],
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
      <nav>{nav.map((item) => <button key={item.id} className={view === item.id ? styles.active : ""} onClick={() => setView(item.id)}><i>{item.icon}</i><span>{item.label}</span>{item.id === "checklist" && <b>{completed}/6</b>}</button>)}</nav>
      <div className={styles.restricted}><span>RESTRICTED BY OWNER</span><strong>Finance · Quotes · Profit</strong><small>Private pricing and management controls are never sent to this role.</small></div>
      <div className={styles.sidebarFoot}><span><i /> Secure session active</span><Link href="/">Public website ↗</Link></div>
    </aside>

    <section className={styles.main}>
      <header className={styles.topbar}><span>Monday, 10 August 2026<strong>Alert Tradie Pro · Operation Hub</strong></span><div><b>SS</b><span>Site Supervisor 01<small>ATP field team</small></span></div></header>
      <div className={styles.content}>
        <section className={styles.heading}><div><p>{heading[view][0]}</p><h1>{heading[view][1]}</h1><span>{heading[view][2]}</span></div><button onClick={() => setView("report")}>＋ Daily report</button></section>

        {view === "workflow" && <WorkflowBoard role="supervisor" />}
        {view === "overview" && <>
          <section className={styles.metrics}><article><span>ASSIGNED PROJECTS</span><strong>2</strong><small>1 active on site</small></article><article><span>TODAY&apos;S DIRECTIONS</span><strong>4</strong><small>2 already completed</small></article><article><span>CHECKLIST</span><strong>{completed}/6</strong><small>Today&apos;s site checks</small></article><article><span>OPEN SITE ISSUES</span><strong>1</strong><small>Awaiting Admin reply</small></article></section>
          <div className={styles.overviewGrid}>
            <section className={styles.panel}><header><div><span>TODAY ON SITE</span><h2>Site direction</h2></div><button onClick={() => setView("schedule")}>Full schedule →</button></header><div className={styles.taskList}>{tasks.map((task) => <article key={task.time}><time>{task.time}</time><i className={styles[task.tone]} /><div><strong>{task.title}</strong><small>{task.project} · Glen Waverley renovation</small></div><button>Open →</button></article>)}</div></section>
            <section className={styles.panel}><header><div><span>QUALITY CONTROL</span><h2>Checklist progress</h2></div><button onClick={() => setView("checklist")}>Open checklist →</button></header><div className={styles.progressRing}><div style={{ "--progress": `${completed / checks.length * 360}deg` } as CSSProperties}><span><strong>{completed}</strong> of {checks.length}</span></div><p><strong>Framing checks underway</strong><small>Complete every relevant item before submitting today&apos;s report.</small></p></div></section>
          </div>
          <section className={`${styles.panel} ${styles.projectTable}`}><header><div><span>ASSIGNED PROJECTS</span><h2>Projects in motion</h2></div><button onClick={() => setView("projects")}>View projects →</button></header><div className={styles.tableHead}><span>Project</span><span>Current stage</span><span>Delivery</span><span>Next direction</span></div><article><div><strong>Glen Waverley renovation</strong><small>ATP-2026-00124 · Glen Waverley</small></div><span>Construction</span><span><i><b style={{ width: "62%" }} /></i>62%</span><strong>Confirm rough-in set-out</strong></article><article><div><strong>Structural assessment 131</strong><small>ATP-2026-00131 · Rowville</small></div><span>Site inspection</span><span><i><b style={{ width: "28%" }} /></i>28%</span><strong>Inspection booked 14 Aug</strong></article></section>
        </>}

        {view === "projects" && <section className={styles.projectCards}><article><p>ATP-2026-00124</p><h2>Glen Waverley renovation</h2><span>Home Renovation · Construction</span><div><i><b style={{ width: "62%" }} /></i><strong>62%</strong></div><dl><dt>Today&apos;s direction</dt><dd>Confirm plumbing set-out and upload marked-up photos.</dd><dt>Customer-visible update</dt><dd>Framing area prepared for services.</dd></dl><button onClick={() => setView("checklist")}>Open site checklist</button></article><article><p>ATP-2026-00131</p><h2>Structural assessment 131</h2><span>Engineering · Site inspection</span><div><i><b style={{ width: "28%" }} /></i><strong>28%</strong></div><dl><dt>Next visit</dt><dd>14 August 2026 · 10:00 am</dd><dt>Site direction</dt><dd>Photograph movement and prepare inspection notes.</dd></dl><button onClick={() => setView("schedule")}>View schedule</button></article></section>}

        {view === "schedule" && <section className={styles.panel}><header><div><span>SITE SUPERVISOR TIME</span><h2>Upcoming directions</h2></div></header><div className={styles.schedule}>{tasks.map((task, index) => <article key={task.time}><time><strong>{index < 2 ? "10" : "12"}</strong><span>AUG<br />{index < 2 ? "MON" : "WED"}</span></time><i className={styles[task.tone]} /><div><strong>{task.title}</strong><small>{task.time} · {task.project}</small></div><span>{index < 2 ? "Today" : "Confirmed"}</span></article>)}</div></section>}

        {view === "checklist" && <section className={styles.panel}><header><div><span>ATP-2026-00124</span><h2>Construction stage checklist</h2></div><strong>{completed} of {checks.length} complete</strong></header><div className={styles.checklist}>{checks.map((item, index) => <label key={item}><input type="checkbox" checked={Boolean(checked[item])} onChange={() => setChecked((current) => ({ ...current, [item]: !current[item] }))} /><span>{checked[item] ? "✓" : index + 1}</span><div><strong>{item}</strong><small>{index < 3 ? "Completed and recorded" : "Tap to confirm when complete"}</small></div></label>)}</div></section>}

        {view === "report" && <form className={`${styles.panel} ${styles.report}`} onSubmit={(event) => { event.preventDefault(); setReportSent(true); }}><header><div><span>END-OF-DAY</span><h2>Daily site report</h2></div><strong>ATP-2026-00124</strong></header><div className={styles.formGrid}><label><span>Work completed</span><textarea required defaultValue="Framing dimensions checked and plumbing set-out confirmed." /></label><label><span>Delay or issue</span><textarea defaultValue="Waiting for one marked-up engineering detail." /></label><label><span>Tomorrow&apos;s requirement</span><textarea required defaultValue="Plumbing rough-in can begin at 7:30 am." /></label><label><span>Site photos</span><div className={styles.upload}>＋ Add customer-safe and internal photos</div></label></div><button>Submit report to Owner</button>{reportSent && <p>✓ Report saved in this GitHub demo. The Full-Stack version sends it to Owner approval.</p>}</form>}

        {view === "messages" && <section className={`${styles.panel} ${styles.messages}`}><header><div><span>PROJECT CHANNEL</span><h2>Owner & Admin</h2></div></header><div><article><small>Admin 01 · 9:12 am</small><p>Please confirm the plumbing set-out before the trade starts.</p></article><article className={styles.mine}><small>Site Supervisor 01 · 9:36 am</small><p>Confirmed. Marked-up photos are ready to upload.</p></article></div><form onSubmit={(event) => { event.preventDefault(); setMessage(""); }}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Message Owner and Admin…" /><button>Send ↑</button></form></section>}
      </div>
    </section>
  </main>;
}

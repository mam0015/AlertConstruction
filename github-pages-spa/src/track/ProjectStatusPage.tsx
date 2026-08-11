"use client";

/* eslint-disable @next/next/no-img-element */

import { Link, useParams } from "../router";
import { FormEvent, useMemo, useState } from "react";
import BrandLogo from "../BrandLogo";
import CustomerWorkflowPanel from "../workflow/CustomerWorkflowPanel";
import styles from "./track.module.css";

type PortalTab = "overview" | "schedule" | "documents";

const stages = [
  { label: "Request received", date: "22 Jun", state: "done" },
  { label: "Admin review", date: "23 Jun", state: "done" },
  { label: "Site inspection", date: "29 Jun", state: "done" },
  { label: "Estimate & quote", date: "06 Jul", state: "done" },
  { label: "Project scheduled", date: "20 Jul", state: "done" },
  { label: "Demolition", date: "03 Aug", state: "done" },
  { label: "Construction", date: "In progress", state: "current" },
  { label: "Final clean", date: "Upcoming", state: "next" },
  { label: "Complete", date: "Upcoming", state: "next" },
] as const;

const schedule = [
  {
    date: "12 AUG",
    day: "Wednesday",
    title: "Plumbing rough-in",
    time: "7:30 am – 1:00 pm",
    company: "Licensed plumbing team",
    status: "Confirmed",
    tone: "confirmed",
  },
  {
    date: "14 AUG",
    day: "Friday",
    title: "Framing inspection",
    time: "10:00 am – 11:30 am",
    company: "Site Supervisor",
    status: "Confirmed",
    tone: "confirmed",
  },
  {
    date: "17 AUG",
    day: "Monday",
    title: "Electrical rough-in",
    time: "7:30 am – 12:00 pm",
    company: "Licensed electrical team",
    status: "Rebooked",
    tone: "changed",
  },
  {
    date: "20 AUG",
    day: "Thursday",
    title: "Wall lining begins",
    time: "8:00 am – 3:30 pm",
    company: "Construction team",
    status: "Planned",
    tone: "planned",
  },
] as const;

const documents = [
  { name: "Accepted project quote", meta: "PDF · Shared 8 Jul 2026", type: "QUOTE" },
  { name: "Current project schedule", meta: "PDF · Updated 9 Aug 2026", type: "PLAN" },
  { name: "Site inspection summary", meta: "PDF · Shared 30 Jun 2026", type: "REPORT" },
] as const;

function formatProjectCode(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "ATP-2026-00124";
  try {
    return decodeURIComponent(value).toUpperCase().replace(/\//g, "-");
  } catch {
    return "ATP-2026-00124";
  }
}

export default function ProjectStatusPage() {
  const params = useParams<{ code: string }>();
  const projectCode = useMemo(() => formatProjectCode(params?.code), [params?.code]);
  const [activeTab, setActiveTab] = useState<PortalTab>("overview");
  const [messageSent, setMessageSent] = useState(false);
  const [documentNotice, setDocumentNotice] = useState("");

  function handleMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessageSent(true);
  }

  return (
    <main className={styles.portalShell}>
      <header className={styles.header}>
        <Link className={styles.logoLink} href="/" aria-label="Alert Tradie Pro home">
          <BrandLogo kind="tradie" tone="dark" className={styles.logo} />
        </Link>
        <nav className={styles.headerNav} aria-label="Customer portal navigation">
          <Link href="/">Home</Link>
          <Link href="/#request">Request a Job</Link>
          <a href="mailto:MAMOBINI@gmail.com?subject=Alert%20Tradie%20Pro%20Support">Support</a>
          <Link className={styles.exitLink} href="/">Exit project</Link>
        </nav>
      </header>

      <section className={styles.portalBar}>
        <span>Customer project portal</span>
        <span className={styles.reference}><i /> Reference&nbsp; {projectCode}</span>
      </section>

      <CustomerWorkflowPanel code={projectCode} />

      <section className={styles.hero}>
        <div className={styles.heroHeading}>
          <div>
            <p className={styles.kicker}>Project status</p>
            <h1>Your renovation is<br />moving forward.</h1>
            <p className={styles.heroCopy}>
              Follow approved updates, upcoming site work and shared project documents in one clear place.
            </p>
          </div>
          <div className={styles.updated}>
            <span>Last customer update</span>
            <strong>9 August 2026 · 10:42 am</strong>
          </div>
        </div>

        <div className={styles.statusBoard}>
          <article className={styles.projectIdentity}>
            <div className={styles.statusLabel}><i /> Work in progress</div>
            <p>HOME RENOVATION</p>
            <h2>Ground floor renovation</h2>
            <dl>
              <div><dt>Project reference</dt><dd>{projectCode}</dd></div>
              <div><dt>Project area</dt><dd>Melbourne, VIC</dd></div>
              <div><dt>Managed by</dt><dd>Alert Construction</dd></div>
            </dl>
          </article>

          <article className={styles.progressPanel}>
            <div className={styles.progressRing} aria-label="Project is 62 percent complete">
              <div><strong>62%</strong><span>complete</span></div>
            </div>
            <div>
              <span className={styles.miniLabel}>Current stage</span>
              <h3>Construction</h3>
              <p>Services rough-in and framing checks are underway.</p>
            </div>
          </article>

          <article className={styles.nextVisit}>
            <span className={styles.miniLabel}>Next confirmed visit</span>
            <div className={styles.dateBlock}><strong>12</strong><span>AUG<br />WED</span></div>
            <h3>Plumbing rough-in</h3>
            <p>7:30 am – 1:00 pm</p>
            <span className={styles.visitConfirmed}>Confirmed</span>
          </article>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.tabs} role="tablist" aria-label="Project information">
          <button className={activeTab === "overview" ? styles.activeTab : ""} type="button" onClick={() => setActiveTab("overview")}>
            <span>01</span> Overview
          </button>
          <button className={activeTab === "schedule" ? styles.activeTab : ""} type="button" onClick={() => setActiveTab("schedule")}>
            <span>02</span> Schedule
          </button>
          <button className={activeTab === "documents" ? styles.activeTab : ""} type="button" onClick={() => setActiveTab("documents")}>
            <span>03</span> Files &amp; Messages
          </button>
        </div>

        {activeTab === "overview" && (
          <div className={styles.overviewGrid}>
            <section className={styles.timelinePanel}>
              <div className={styles.sectionTitle}>
                <div><p className={styles.kicker}>Project journey</p><h2>Progress timeline</h2></div>
                <span>6 of 9 stages reached</span>
              </div>
              <ol className={styles.timeline}>
                {stages.map((stage, index) => (
                  <li className={styles[stage.state]} key={stage.label}>
                    <span className={styles.timelineMarker}>{stage.state === "done" ? "✓" : index + 1}</span>
                    <div><strong>{stage.label}</strong><small>{stage.date}</small></div>
                  </li>
                ))}
              </ol>
            </section>

            <aside className={styles.sideColumn}>
              <article className={styles.updateCard}>
                <div className={styles.updateImage}>
                  <img src="images/hero-construction.webp" alt="Customer-visible site progress update" />
                  <span>Site update · 3 photos</span>
                </div>
                <div className={styles.updateCopy}>
                  <span className={styles.miniLabel}>Latest update · 9 Aug</span>
                  <h3>Framing area prepared for services</h3>
                  <p>The demolition area is clear and the team has marked the new service locations ahead of the plumbing rough-in.</p>
                  <button type="button" onClick={() => setDocumentNotice("Photo gallery preview opened.")}>View update photos <span>→</span></button>
                  {documentNotice && <small className={styles.inlineNotice}>{documentNotice}</small>}
                </div>
              </article>

              <article className={styles.actionCard}>
                <span className={styles.miniLabel}>Your next step</span>
                <h3>No action required</h3>
                <p>Your next site visit is confirmed. We will notify you if timing or access requirements change.</p>
                <button type="button" onClick={() => setActiveTab("documents")}>Message the team</button>
              </article>
            </aside>
          </div>
        )}

        {activeTab === "schedule" && (
          <section className={styles.schedulePanel}>
            <div className={styles.sectionTitle}>
              <div><p className={styles.kicker}>Customer schedule</p><h2>Upcoming site work</h2></div>
              <span>Dates approved for customer view</span>
            </div>
            <div className={styles.scheduleList}>
              {schedule.map((item) => (
                <article className={styles.scheduleRow} key={item.date + item.title}>
                  <div className={styles.scheduleDate}><strong>{item.date.split(" ")[0]}</strong><span>{item.date.split(" ")[1]}<br />{item.day}</span></div>
                  <div className={styles.scheduleName}><span>{item.company}</span><h3>{item.title}</h3></div>
                  <div className={styles.scheduleTime}><span>Arrival window</span><strong>{item.time}</strong></div>
                  <span className={`${styles.scheduleStatus} ${styles[item.tone]}`}>{item.status}</span>
                </article>
              ))}
            </div>
            <div className={styles.delayNote}>
              <strong>Schedule change</strong>
              <p>Electrical rough-in moved from 15 August to 17 August due to trade availability. The new date is confirmed.</p>
            </div>
          </section>
        )}

        {activeTab === "documents" && (
          <div className={styles.documentsGrid}>
            <section className={styles.documentsPanel}>
              <div className={styles.sectionTitle}>
                <div><p className={styles.kicker}>Shared with you</p><h2>Project files</h2></div>
                <span>3 customer documents</span>
              </div>
              <div className={styles.documentList}>
                {documents.map((document) => (
                  <article key={document.name}>
                    <span className={styles.fileType}>{document.type}</span>
                    <div><strong>{document.name}</strong><small>{document.meta}</small></div>
                    <button type="button" onClick={() => setDocumentNotice(`${document.name} is ready in the design preview.`)}>View file</button>
                  </article>
                ))}
              </div>
              {documentNotice && <p className={styles.documentNotice}>{documentNotice}</p>}
            </section>

            <section className={styles.messagePanel}>
              <p className={styles.kicker}>Project support</p>
              <h2>Message the team</h2>
              <p>Send a question about access, timing or a customer-visible project update.</p>
              <form onSubmit={handleMessage}>
                <label><span>Subject</span><input placeholder="What is your question about?" required /></label>
                <label><span>Message</span><textarea rows={6} placeholder="Write your message here..." required /></label>
                <button type="submit">Send message <span>→</span></button>
              </form>
              {messageSent && <div className={styles.sentNotice}><strong>Message preview complete.</strong><span>No message was sent from this design preview.</span></div>}
            </section>
          </div>
        )}
      </section>

      <footer className={styles.footer}>
        <BrandLogo kind="tradie" tone="dark" className={styles.footerLogo} />
        <p>Customer-visible project information only.</p>
        <div><a href="mailto:MAMOBINI@gmail.com?subject=Alert%20Tradie%20Pro%20Support">Support</a><Link href="/">Return home</Link></div>
      </footer>
    </main>
  );
}

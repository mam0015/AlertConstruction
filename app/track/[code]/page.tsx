"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BrandLogo from "../../BrandLogo";
import styles from "./track.module.css";

type PortalTab = "overview" | "schedule" | "documents";
type TrackingRecord = {
  code: string;
  recordType: "project" | "request";
  name: string;
  service: string;
  stage: string;
  progress: number;
  suburb: string;
  notes: string;
  updatedAt: string;
  attachmentCount: number;
};

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
  const [messageBusy, setMessageBusy] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [documentNotice, setDocumentNotice] = useState("");
  const [record, setRecord] = useState<TrackingRecord | null>(null);
  const [lookupState, setLookupState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let active = true;
    fetch(`/api/track/${encodeURIComponent(projectCode)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<TrackingRecord>;
      })
      .then((result) => {
        if (!active) return;
        setRecord(result);
        setLookupState("ready");
      })
      .catch(() => {
        if (!active) return;
        setRecord(null);
        setLookupState("missing");
      });
    return () => { active = false; };
  }, [projectCode]);

  const isRequest = record?.recordType === "request";
  const journeyStages = useMemo(() => isRequest ? [
    { label: "Request received", date: "Complete", state: "done" as const },
    { label: "Admin review", date: "Current", state: "current" as const },
    { label: "Initial contact", date: "Upcoming", state: "next" as const },
    { label: "Site inspection", date: "Upcoming", state: "next" as const },
    { label: "Estimate & quote", date: "Upcoming", state: "next" as const },
    { label: "Project scheduled", date: "Upcoming", state: "next" as const },
    { label: "Delivery", date: "Upcoming", state: "next" as const },
  ] : stages, [isRequest]);

  async function handleMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setMessageBusy(true);
    setMessageError("");
    setMessageSent(false);
    try {
      const response = await fetch(`/api/track/${encodeURIComponent(projectCode)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: fields.get("subject"), message: fields.get("message") }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The message could not be saved.");
      form.reset();
      setMessageSent(true);
    } catch (error) {
      setMessageError(error instanceof Error ? error.message : "The message could not be saved.");
    } finally {
      setMessageBusy(false);
    }
  }

  if (lookupState !== "ready" || !record) {
    return <main className={styles.portalShell}>
      <header className={styles.header}>
        <Link className={styles.logoLink} href="/" aria-label="Alert Tradie Pro home"><BrandLogo kind="tradie" tone="dark" className={styles.logo} /></Link>
        <nav className={styles.headerNav} aria-label="Customer portal navigation"><Link href="/">Home</Link><Link href="/#request">Request a Job</Link><Link className={styles.exitLink} href="/">Exit project</Link></nav>
      </header>
      <section className={styles.lookupState}>
        <p className={styles.kicker}>{lookupState === "loading" ? "Checking project reference" : "Reference not found"}</p>
        <h1>{lookupState === "loading" ? "Loading your project…" : "We could not find that tracking code."}</h1>
        <p>{lookupState === "loading" ? "Please wait while we retrieve the latest customer-visible status." : "Check the code and try again from Customer Sign In on the homepage."}</p>
        {lookupState === "missing" && <Link href="/">Return to Customer Sign In</Link>}
      </section>
    </main>;
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

      <section className={styles.hero}>
        <div className={styles.heroHeading}>
          <div>
            <p className={styles.kicker}>Project status</p>
            <h1>{isRequest ? <>Your request has<br />been received.</> : <>Your project is<br />moving forward.</>}</h1>
            <p className={styles.heroCopy}>
              {isRequest ? "Your details are saved. Our team will review the request before project stages and dates are added." : "Follow approved updates, upcoming site work and shared project documents in one clear place."}
            </p>
          </div>
          <div className={styles.updated}>
            <span>Last customer update</span>
            <strong>{new Date(record.updatedAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })}</strong>
          </div>
        </div>

        <div className={styles.statusBoard}>
          <article className={styles.projectIdentity}>
            <div className={styles.statusLabel}><i /> {isRequest ? "Request received" : "Work in progress"}</div>
            <p>{record.service.toUpperCase()}</p>
            <h2>{isRequest ? `${record.service} request` : record.name}</h2>
            <dl>
              <div><dt>Project reference</dt><dd>{projectCode}</dd></div>
              <div><dt>Project area</dt><dd>{record.suburb || "Melbourne, VIC"}</dd></div>
              <div><dt>Managed by</dt><dd>{record.service.toLowerCase().includes("engineer") ? "Alert Engineers" : "Alert Construction"}</dd></div>
            </dl>
          </article>

          <article className={styles.progressPanel}>
            <div className={styles.progressRing} aria-label={`Project is ${record.progress} percent complete`} style={{ background: `conic-gradient(var(--portal-gold) 0 ${record.progress}%, #2c3032 ${record.progress}% 100%)` }}>
              <div><strong>{record.progress}%</strong><span>complete</span></div>
            </div>
            <div>
              <span className={styles.miniLabel}>Current stage</span>
              <h3>{record.stage}</h3>
              <p>{isRequest ? "The Admin team will review your scope and contact details." : record.notes}</p>
            </div>
          </article>

          <article className={styles.nextVisit}>
            <span className={styles.miniLabel}>{isRequest ? "Next step" : "Next confirmed visit"}</span>
            {isRequest ? <><div className={styles.dateBlock}><strong>01</strong><span>TEAM<br />REVIEW</span></div><h3>Request assessment</h3><p>We will contact you after the initial review.</p><span className={styles.visitConfirmed}>Pending review</span></> : <><div className={styles.dateBlock}><strong>12</strong><span>AUG<br />WED</span></div><h3>Plumbing rough-in</h3><p>7:30 am – 1:00 pm</p><span className={styles.visitConfirmed}>Confirmed</span></>}
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
                <span>{isRequest ? "Request registered" : "6 of 9 stages reached"}</span>
              </div>
              <ol className={styles.timeline}>
                {journeyStages.map((stage, index) => (
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
                  <img src="/images/hero-construction.webp" alt="Customer-visible site progress update" />
                  <span>{isRequest ? `Request upload · ${record.attachmentCount} file${record.attachmentCount === 1 ? "" : "s"}` : "Site update · 3 photos"}</span>
                </div>
                <div className={styles.updateCopy}>
                  <span className={styles.miniLabel}>{isRequest ? "Latest update · request received" : "Latest update · 9 Aug"}</span>
                  <h3>{isRequest ? "Your request is safely in the review queue" : "Framing area prepared for services"}</h3>
                  <p>{isRequest ? "The Admin team can now review the scope, contact details and submitted files before assigning the next action." : "The demolition area is clear and the team has marked the new service locations ahead of the plumbing rough-in."}</p>
                  {!isRequest && <button type="button" onClick={() => setDocumentNotice("Photo gallery preview opened.")}>View update photos <span>→</span></button>}
                  {documentNotice && <small className={styles.inlineNotice}>{documentNotice}</small>}
                </div>
              </article>

              <article className={styles.actionCard}>
                <span className={styles.miniLabel}>Your next step</span>
                <h3>{isRequest ? "Wait for our review" : "No action required"}</h3>
                <p>{isRequest ? "We will contact you when the request has been reviewed or if more information is required." : "Your next site visit is confirmed. We will notify you if timing or access requirements change."}</p>
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
              {isRequest ? <div className={styles.emptySchedule}><strong>No site dates have been approved yet.</strong><span>The schedule will appear here after the request is reviewed and accepted.</span></div> : schedule.map((item) => (
                <article className={styles.scheduleRow} key={item.date + item.title}>
                  <div className={styles.scheduleDate}><strong>{item.date.split(" ")[0]}</strong><span>{item.date.split(" ")[1]}<br />{item.day}</span></div>
                  <div className={styles.scheduleName}><span>{item.company}</span><h3>{item.title}</h3></div>
                  <div className={styles.scheduleTime}><span>Arrival window</span><strong>{item.time}</strong></div>
                  <span className={`${styles.scheduleStatus} ${styles[item.tone]}`}>{item.status}</span>
                </article>
              ))}
            </div>
            {!isRequest && <div className={styles.delayNote}>
              <strong>Schedule change</strong>
              <p>Electrical rough-in moved from 15 August to 17 August due to trade availability. The new date is confirmed.</p>
            </div>}
          </section>
        )}

        {activeTab === "documents" && (
          <div className={styles.documentsGrid}>
            <section className={styles.documentsPanel}>
              <div className={styles.sectionTitle}>
                <div><p className={styles.kicker}>Shared with you</p><h2>Project files</h2></div>
                <span>{isRequest ? `${record.attachmentCount} submitted file${record.attachmentCount === 1 ? "" : "s"}` : "3 customer documents"}</span>
              </div>
              <div className={styles.documentList}>
                {isRequest ? <article><span className={styles.fileType}>INFO</span><div><strong>Request attachments received</strong><small>{record.attachmentCount ? `${record.attachmentCount} file${record.attachmentCount === 1 ? "" : "s"} are stored with your request` : "No files were attached"}</small></div></article> : documents.map((document) => (
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
                <label><span>Subject</span><input name="subject" placeholder="What is your question about?" required /></label>
                <label><span>Message</span><textarea name="message" rows={6} placeholder="Write your message here..." required /></label>
                <button type="submit" disabled={messageBusy}>{messageBusy ? "Saving…" : "Send message"} <span>→</span></button>
              </form>
              {messageError && <p className={styles.messageError} role="alert">{messageError}</p>}
              {messageSent && <div className={styles.sentNotice}><strong>Message saved.</strong><span>Your message is now attached to this project reference.</span></div>}
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

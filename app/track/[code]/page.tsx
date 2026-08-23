"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import BrandLogo from "../../BrandLogo";
import CustomerWorkflowPanel from "../../workflow/CustomerWorkflowPanel";
import styles from "./track.module.css";

function formatProjectCode(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try {
    return decodeURIComponent(value).toUpperCase().replace(/\/+|\s+/g, "-");
  } catch {
    return "";
  }
}

export default function ProjectStatusPage() {
  const params = useParams<{ code: string }>();
  const projectCode = useMemo(() => formatProjectCode(params?.code), [params?.code]);

  return (
    <main className={styles.portalShell}>
      <header className={styles.header}>
        <Link className={styles.logoLink} href="/" aria-label="Alert Tradie Pro home">
          <BrandLogo kind="tradie" tone="dark" className={styles.logo} />
        </Link>
        <nav className={styles.headerNav} aria-label="Customer portal navigation">
          <Link href="/">Home</Link>
          <Link href="/#request">Secure support</Link>
          <Link className={styles.exitLink} href="/">Exit project</Link>
        </nav>
      </header>

      <section className={styles.portalBar}>
        <span>Secure customer project portal</span>
        <span className={styles.reference}><i /> Reference&nbsp; {projectCode || "Not supplied"}</span>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroHeading}>
          <div>
            <p className={styles.kicker}>Approved project information</p>
            <h1>Your live project<br />record.</h1>
            <p className={styles.heroCopy}>Only information approved for customer viewing is shown. No placeholder percentage, date, document or site update is displayed.</p>
          </div>
        </div>
      </section>

      {projectCode ? <CustomerWorkflowPanel code={projectCode} /> : <section className={styles.workspace}>Enter a valid request or project reference from the home page.</section>}

      <footer className={styles.footer}>
        <BrandLogo kind="tradie" tone="dark" className={styles.footerLogo} />
        <p>Customer-visible project information only.</p>
        <div><Link href="/#request">Secure support</Link><Link href="/">Return home</Link></div>
      </footer>
    </main>
  );
}

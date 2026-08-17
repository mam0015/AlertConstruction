"use client";

import { Link, useParams } from "../router";
import { useMemo } from "react";
import BrandLogo from "../BrandLogo";
import CustomerWorkflowPanel from "../workflow/CustomerWorkflowPanel";
import styles from "./track.module.css";

function formatProjectCode(raw: string | string[] | undefined) {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try { return decodeURIComponent(value).toUpperCase().replace(/\/+|\s+/g, "-"); }
  catch { return ""; }
}

export default function ProjectStatusPage() {
  const params = useParams<{ code: string }>();
  const projectCode = useMemo(() => formatProjectCode(params?.code), [params?.code]);

  return <main className={styles.portalShell}>
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
      <span className={styles.reference}><i /> Reference&nbsp; {projectCode || "Not entered"}</span>
    </section>

    {projectCode
      ? <CustomerWorkflowPanel code={projectCode} />
      : <section style={{maxWidth:760,margin:"64px auto",padding:32}}><h1>Enter your project reference from the homepage.</h1></section>}

    <footer className={styles.footer}>
      <BrandLogo kind="tradie" tone="dark" className={styles.footerLogo} />
      <p>Only information approved for customer view is displayed.</p>
      <div><a href="mailto:MAMOBINI@gmail.com?subject=Alert%20Tradie%20Pro%20Support">Support</a><Link href="/">Return home</Link></div>
    </footer>
  </main>;
}

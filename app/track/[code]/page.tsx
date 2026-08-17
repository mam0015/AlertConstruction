"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import BrandLogo from "../../BrandLogo";
import CustomerWorkflowPanel from "../../workflow/CustomerWorkflowPanel";
import styles from "./track.module.css";

export default function ProjectStatusPage() {
  const params = useParams<{ code: string }>();
  const code = useMemo(() => {
    try { return decodeURIComponent(params?.code ?? "").trim().toUpperCase().replace(/\/+|\s+/g, "-"); }
    catch { return ""; }
  }, [params?.code]);

  return <main className={styles.portalShell}>
    <header className={styles.header}>
      <Link className={styles.logoLink} href="/" aria-label="Alert Tradie Pro home"><BrandLogo kind="tradie" tone="dark" className={styles.logo} /></Link>
      <nav className={styles.headerNav}><Link href="/">Home</Link><Link href="/#request">Request a Job</Link><Link className={styles.exitLink} href="/">Exit project</Link></nav>
    </header>
    <section className={styles.portalBar}><span>Customer project portal</span><span className={styles.reference}><i /> Reference&nbsp; {code || "Not entered"}</span></section>
    {code ? <CustomerWorkflowPanel code={code} /> : <section style={{maxWidth:760,margin:"64px auto",padding:32}}><h1>Enter your project reference from the homepage.</h1></section>}
    <footer className={styles.footer}><BrandLogo kind="tradie" tone="dark" className={styles.footerLogo} /><p>Only approved customer information is displayed.</p><div><Link href="/">Return home</Link></div></footer>
  </main>;
}

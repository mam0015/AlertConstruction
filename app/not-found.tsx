import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b0d0e", color: "#f1efe8", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
    <div style={{ maxWidth: 460 }}>
      <p style={{ margin: 0, color: "#f5b900", fontSize: 13, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Alert Tradie Pro</p>
      <h1 style={{ margin: "12px 0 10px", fontSize: 34 }}>This page was not found</h1>
      <p style={{ margin: "0 0 24px", color: "#b9b4a8", lineHeight: 1.6 }}>The link may be old or mistyped. You can go back to the home page to request a job or follow your project.</p>
      <Link href="/" style={{ display: "inline-block", padding: "13px 24px", background: "#f5b900", color: "#080909", fontWeight: 800, textDecoration: "none" }}>Back to home</Link>
    </div>
  </main>;
}

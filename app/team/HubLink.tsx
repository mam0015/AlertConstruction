import Link from "next/link";

// Floating shortcut shown on every workspace so each role reaches its calendar, team messages and end-of-day report.
export default function HubLink() {
  return <Link href="/team/hub" aria-label="Open calendar and team messages" style={{ position: "fixed", right: 18, bottom: 18, zIndex: 60, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 46, padding: "0 20px", background: "#f5b900", color: "#080909", fontFamily: "Arial, sans-serif", fontSize: 13, fontWeight: 800, textDecoration: "none", boxShadow: "0 8px 28px rgba(0,0,0,.45)" }}>📅 Calendar &amp; messages</Link>;
}

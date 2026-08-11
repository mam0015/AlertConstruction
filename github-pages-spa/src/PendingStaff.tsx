import BrandLogo from "./BrandLogo";
import { Link } from "./router";

export default function PendingStaff() {
  return <main className="pending-shell">
    <section className="pending-card">
      <BrandLogo kind="tradie" tone="dark" className="pending-logo" />
      <span className="pending-kicker">Owner approval required</span>
      <h1>Your access request is being reviewed.</h1>
      <p>The Owner has been notified that a new staff account used the company Team Code. After the Owner confirms your role, this page opens the correct workspace automatically in the Full-Stack version.</p>
      <div className="pending-steps"><div className="done"><i>✓</i><span><strong>Details received</strong><small>Email, password and Team Code checked</small></span></div><div className="current"><i>2</i><span><strong>Owner review</strong><small>Role and trade are waiting for approval</small></span></div><div><i>3</i><span><strong>Workspace access</strong><small>Admin, Site Supervisor, Worker or trade page</small></span></div></div>
      <div className="pending-note"><strong>GitHub Pages visual demo</strong><span>Secure account approval requires the included Full-Stack deployment. No password is stored in this public demo.</span></div>
      <Link href="/">Return to public website</Link>
    </section>
  </main>;
}

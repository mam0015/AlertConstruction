import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "../site/PageShell";
import { FAQ, PRODUCT_NAME, SUPPORT_EMAIL, SUPPORT_SUBJECT } from "../site/site-content";

export const metadata: Metadata = {
  title: "Support",
  description: `Have a problem or a question about ${PRODUCT_NAME}? Email us and we will reply as fast as we can.`,
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}`;
  return (
    <PageShell
      active="support"
      kicker="Support"
      title="We are here to help"
      lead="Any problem or issue with your request, your sign-in or your project? Email us. We reply as fast as we can."
    >
      <section className="pg-section">
        <div className="pg-wrap pg-support">
          <article className="pg-contact" aria-labelledby="support-email-title">
            <p className="pg-eyebrow">Email support</p>
            <h2 id="support-email-title">Write to us</h2>
            <p>Tell us what happened and, if you have it, your project reference. The more we know, the faster we can fix it.</p>
            <a className="pg-email" href={mailto}>{SUPPORT_EMAIL}</a>
            <a className="pg-button pg-button-primary" href={mailto}>Email Support</a>
            <p className="pg-note"><strong>Please never send a password or a payment-card number by email.</strong> We will never ask for one.</p>
          </article>
          <aside className="pg-help" aria-label="Quick answers">
            <h2>Quick answers</h2>
            {FAQ.slice(0, 3).map((item) => (
              <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>
            ))}
            <p><Link className="pg-link" href="/why-us#faq">More questions <span aria-hidden="true">→</span></Link></p>
          </aside>
        </div>
      </section>

      <section className="pg-section pg-soft">
        <div className="pg-wrap">
          <p className="pg-eyebrow">How {PRODUCT_NAME} works</p>
          <h2>Three steps</h2>
          <ol className="pg-steps pg-steps-3">
            <li><span aria-hidden="true">1</span><div><h3>Request a job</h3><p>Choose a service, add your project details and attach any useful photos or plans.</p></div></li>
            <li><span aria-hidden="true">2</span><div><h3>Receive your project reference</h3><p>Once the system accepts your request you receive a private reference. Keep it safe: it opens your project.</p></div></li>
            <li><span aria-hidden="true">3</span><div><h3>Track the project</h3><p>Use Customer Sign In to see approved updates, scheduled work and your documents.</p></div></li>
          </ol>
          <div className="pg-actions pg-actions-left">
            <Link className="pg-button pg-button-primary" href="/#request">Request a Job</Link>
            <Link className="pg-button pg-button-outline" href="/#customer-sign-in">Customer Sign In</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

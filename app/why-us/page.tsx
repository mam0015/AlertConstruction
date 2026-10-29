import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "../site/PageShell";
import { CONSTRUCTION_NAME, ENGINEERS_NAME, FAQ, PRODUCT_NAME, REASONS } from "../site/site-content";

export const metadata: Metadata = {
  title: `Why ${PRODUCT_NAME}`,
  description: `Why customers choose ${PRODUCT_NAME}: one place for the whole project, clear updates, builder and engineer working together, written estimates and a private portal.`,
  alternates: { canonical: "/why-us" },
};

export default function WhyUsPage() {
  return (
    <PageShell
      active="why"
      kicker="Why choose us"
      title={`Why ${PRODUCT_NAME}`}
      lead={`Building work is stressful when you cannot see what is happening. ${PRODUCT_NAME} is how ${CONSTRUCTION_NAME} and ${ENGINEERS_NAME} keep you informed, from the first enquiry to the day you get the keys back.`}
      actions={<><Link className="pg-button pg-button-primary" href="/#request">Request a Job</Link><Link className="pg-button pg-button-ghost" href="/services">Our services</Link></>}
    >
      <section className="pg-section">
        <div className="pg-wrap">
          <p className="pg-eyebrow">What you get</p>
          <h2>Eight reasons customers choose us</h2>
          <ul className="pg-reasons">
            {REASONS.map((reason) => (
              <li key={reason.title}>
                <span aria-hidden="true">{reason.icon}</span>
                <div><h3>{reason.title}</h3><p>{reason.text}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pg-section pg-soft">
        <div className="pg-wrap pg-split">
          <div>
            <p className="pg-eyebrow">Our promise</p>
            <h2>In plain words</h2>
          </div>
          <div className="pg-prose">
            <p>You will know what we are going to do before we do it. You will see what has been done while it is being done. And if something changes, you will hear it from us, in writing, before it is built.</p>
            <p>We do not hide behind jargon. When an engineer or a builder says something technical, the portal explains it in words an owner can use.</p>
            <p>If something goes wrong, you can reach a real person: <Link className="pg-link" href="/support">Support</Link> reads every email.</p>
          </div>
        </div>
      </section>

      <section className="pg-section" id="faq">
        <div className="pg-wrap pg-faq">
          <p className="pg-eyebrow">Questions</p>
          <h2>Before you start</h2>
          {FAQ.map((item) => (
            <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>
          ))}
          <div className="pg-actions pg-actions-left">
            <Link className="pg-button pg-button-primary" href="/#request">Request a Job</Link>
            <Link className="pg-button pg-button-outline" href="/support">Ask Support</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

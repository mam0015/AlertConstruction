import type { Metadata } from "next";
import Link from "next/link";
import BrandLogo from "../BrandLogo";
import PageShell from "../site/PageShell";
import { CONSTRUCTION_NAME, CONSTRUCTION_URL, ENGINEERS_NAME, ENGINEERS_URL, JOURNEY, PRODUCT_NAME } from "../site/site-content";

export const metadata: Metadata = {
  title: "About Us",
  description: `${PRODUCT_NAME} is the online home of ${CONSTRUCTION_NAME}'s customers: request a job, share your documents and follow your project. ${CONSTRUCTION_NAME} works with ${ENGINEERS_NAME} for engineering.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell
      active="about"
      kicker="About us"
      title={`About ${PRODUCT_NAME}`}
      lead={`${PRODUCT_NAME} is where ${CONSTRUCTION_NAME}'s customers request work, share their documents and follow their project from the first enquiry to handover.`}
      actions={<><Link className="pg-button pg-button-primary" href="/#request">Request a Job</Link><Link className="pg-button pg-button-ghost" href="/services">See our services</Link></>}
    >
      <section className="pg-section">
        <div className="pg-wrap pg-split">
          <div>
            <p className="pg-eyebrow">What it is</p>
            <h2>One online home for your project</h2>
          </div>
          <div className="pg-prose">
            <p>{PRODUCT_NAME} is part of {CONSTRUCTION_NAME}. It is the customer side of the business: a private place on the web where you tell us what you need, send photos and plans, and then watch the project move forward.</p>
            <p>{CONSTRUCTION_NAME} builds and renovates homes. For the engineering side of its projects it works with {ENGINEERS_NAME}, so structure, assessments and reports are done by engineers, not guessed by a builder.</p>
            <p>You do not need to learn a new system. You send one request, our team follows it up, and what you are allowed to see appears in your portal.</p>
          </div>
        </div>
      </section>

      <section className="pg-section pg-soft">
        <div className="pg-wrap">
          <p className="pg-eyebrow">Who is behind it</p>
          <h2>Three names, one team</h2>
          <div className="pg-cards pg-cards-3">
            <article className="pg-card">
              <div className="pg-logo"><BrandLogo kind="construction" /></div>
              <h3>{CONSTRUCTION_NAME}</h3>
              <p>Kitchens, bathrooms, whole-home renovations, extensions, new homes, building inspections, maintenance and repairs. The builder you deal with from the first visit to handover.</p>
              <a className="pg-link" href={CONSTRUCTION_URL} target="_blank" rel="noopener noreferrer">Visit {CONSTRUCTION_NAME} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            </article>
            <article className="pg-card">
              <div className="pg-logo"><BrandLogo kind="engineers" /></div>
              <h3>{ENGINEERS_NAME}</h3>
              <p>Structural engineering, assessments, reports and technical advice. {CONSTRUCTION_NAME} takes its engineering from {ENGINEERS_NAME}, and you can also ask {ENGINEERS_NAME} for engineering on its own.</p>
              <a className="pg-link" href={ENGINEERS_URL} target="_blank" rel="noopener noreferrer">Visit {ENGINEERS_NAME} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            </article>
            <article className="pg-card pg-card-accent">
              <div className="pg-logo"><BrandLogo kind="tradie" /></div>
              <h3>{PRODUCT_NAME}</h3>
              <p>The online portal of {CONSTRUCTION_NAME}. Request a job, upload your documents, sign in and see your project and its news in one place.</p>
              <Link className="pg-link" href="/#customer-sign-in">Customer Sign In <span aria-hidden="true">→</span></Link>
            </article>
          </div>
        </div>
      </section>

      <section className="pg-section">
        <div className="pg-wrap">
          <p className="pg-eyebrow">How it works for you</p>
          <h2>From first enquiry to handover</h2>
          <ol className="pg-steps">
            {JOURNEY.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">{index + 1}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </li>
            ))}
          </ol>
          <div className="pg-actions pg-actions-left">
            <Link className="pg-button pg-button-primary" href="/#request">Request a Job</Link>
            <Link className="pg-button pg-button-outline" href="/#customer-sign-in">Customer Sign In</Link>
            <Link className="pg-button pg-button-outline" href="/why-us">Why choose us</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

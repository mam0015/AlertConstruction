import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "../site/PageShell";
import { CONSTRUCTION_NAME, ENGINEERS_NAME } from "../site/site-content";
import ServiceList from "./ServiceList";

export const metadata: Metadata = {
  title: "Services",
  description: `Kitchen and bathroom renovations, home renovations and extensions, new homes, building inspections, maintenance and repairs from ${CONSTRUCTION_NAME}, and engineering services from ${ENGINEERS_NAME}.`,
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <PageShell
      active="services"
      kicker="Our services"
      title="Services for every stage of your project"
      lead={`Choose the service you need. Press About to see what it usually includes, or Request this Service to start. ${CONSTRUCTION_NAME} builds; ${ENGINEERS_NAME} does the engineering.`}
    >
      <section className="pg-section">
        <div className="pg-wrap pg-wide">
          <ServiceList />
          <div className="pg-callout">
            <h2>Not sure which one you need?</h2>
            <p>Choose “Other” on the request form and describe the job in your own words. We will point you to the right team.</p>
            <div className="pg-actions pg-actions-left">
              <Link className="pg-button pg-button-primary" href="/#request">Request a Job</Link>
              <Link className="pg-button pg-button-outline" href="/support">Ask Support</Link>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

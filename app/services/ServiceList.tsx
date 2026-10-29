"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { CONSTRUCTION_NAME, ENGINEERS_NAME, SERVICES } from "../site/site-content";

// Every service as a card with "Request this Service" and "About". About opens the plain-language explanation of what the service includes.
// A link such as /services#kitchen-renovations opens that card's About.
export default function ServiceList() {
  const [open, setOpen] = useState<string | null>(null);
  const baseId = useId();

  useEffect(() => {
    const fromHash = () => {
      const slug = window.location.hash.replace(/^#/, "");
      if (SERVICES.some((service) => service.slug === slug)) {
        setOpen(slug);
        window.requestAnimationFrame(() => document.getElementById(slug)?.scrollIntoView({ block: "start" }));
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  return (
    <div className="svc-grid">
      {SERVICES.map((service) => {
        const isOpen = open === service.slug;
        const panelId = `${baseId}-${service.slug}`;
        return (
          <article className={`svc-card ${isOpen ? "is-open" : ""}`} id={service.slug} key={service.slug}>
            <div className="svc-image"><img src={service.image} alt="" loading="lazy" /></div>
            <div className="svc-body">
              <small>{service.brand === CONSTRUCTION_NAME ? CONSTRUCTION_NAME : ENGINEERS_NAME}</small>
              <h3>{service.title}</h3>
              <p>{service.tagline}</p>
              <div className="svc-buttons">
                <Link className="pg-button pg-button-primary" href={`/?service=${encodeURIComponent(service.title)}#request`}>Request this Service <span aria-hidden="true">→</span></Link>
                <button className="pg-button pg-button-outline" type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpen(isOpen ? null : service.slug)}>
                  About<span className="sr-only"> {service.title}</span> <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
                </button>
              </div>
              <div className="svc-about" id={panelId} role="region" aria-label={`About ${service.title}`} hidden={!isOpen}>
                <p>{service.about}</p>
                <h4>What it usually includes</h4>
                <ul>{service.includes.map((item) => <li key={item}>{item}</li>)}</ul>
                <h4>A good fit for</h4>
                <p>{service.goodFor}</p>
                <p className="svc-fine">What is included in your project is set out in your written estimate or contract. A request on this site is an enquiry only.</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
